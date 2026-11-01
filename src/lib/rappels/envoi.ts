// Envoi réel des rappels : e-mail via Resend (par défaut) ou via un scénario
// Make (EMAIL_FOURNISSEUR=make), WhatsApp via l'API Cloud de Meta (modèle de
// message approuvé). Un seul endroit à adapter si le prestataire change.
// Aucune dépendance : simple `fetch`.

export type ResultatEnvoi = { ok: true } | { ok: false; error: string };

/**
 * Fichier joint à un e-mail : soit téléchargé par le prestataire depuis `url`, soit transmis
 * directement (`contenuBase64`, pour un document généré par l'application et jamais publié).
 */
export type PieceJointe = { nom: string } & ({ url: string } | { contenuBase64: string });

export interface Envoyeurs {
  email(to: string, sujet: string, texte: string, piecesJointes?: PieceJointe[]): Promise<ResultatEnvoi>;
  /** `parametres` remplit dans l'ordre les variables {{1}}, {{2}}… du modèle. */
  whatsappApi(telephone: string, parametres: string[]): Promise<ResultatEnvoi>;
}

async function appeler(url: string, init: RequestInit): Promise<ResultatEnvoi> {
  try {
    const res = await fetch(url, init);
    if (res.ok) return { ok: true };
    const corps = await res.text().catch(() => "");
    return { ok: false, error: `Le service a répondu ${res.status} ${corps.slice(0, 200)}`.trim() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Envoi impossible." };
  }
}

export async function emailParResend(
  to: string,
  sujet: string,
  texte: string,
  piecesJointes: PieceJointe[] = [],
): Promise<ResultatEnvoi> {
  const cle = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!cle || !from) return { ok: false, error: "E-mail non configuré (RESEND_API_KEY / RESEND_FROM)." };
  return appeler("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      subject: sujet,
      text: texte,
      ...(piecesJointes.length > 0
        ? {
            attachments: piecesJointes.map((p) =>
              "url" in p ? { filename: p.nom, path: p.url } : { filename: p.nom, content: p.contenuBase64 },
            ),
          }
        : {}),
    }),
  });
}

/**
 * Envoi par un scénario Make (webhook → Gmail). Le scénario doit se terminer par un module
 * « Webhook response » : sans lui Make répond « reçu » avant l'envoi, et un échec de Gmail
 * passerait inaperçu. Une réponse JSON `{ "ok": false, "error": "…" }` est traitée comme un échec.
 */
export async function emailParMake(
  to: string,
  sujet: string,
  texte: string,
  piecesJointes: PieceJointe[] = [],
): Promise<ResultatEnvoi> {
  const url = process.env.MAKE_WEBHOOK_URL;
  const secret = process.env.MAKE_WEBHOOK_SECRET;
  if (!url || !secret) return { ok: false, error: "E-mail non configuré (MAKE_WEBHOOK_URL / MAKE_WEBHOOK_SECRET)." };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-padelmeet-secret": secret },
      // Le secret est aussi dans le corps : Make présente les en-têtes comme une liste difficile à filtrer,
      // alors qu'un champ du corps se choisit directement dans le filtre (« secret » = valeur attendue).
      body: JSON.stringify({
        secret,
        destinataire: to,
        sujet,
        texte,
        pieces_jointes: piecesJointes.map((p) =>
          "url" in p ? { nom: p.nom, url: p.url } : { nom: p.nom, contenu_base64: p.contenuBase64 },
        ),
      }),
      signal: AbortSignal.timeout(25_000),
    });
    const corps = await res.text().catch(() => "");
    if (!res.ok) return { ok: false, error: `Make a répondu ${res.status} ${corps.slice(0, 200)}`.trim() };
    // « Accepted » : réponse de Make à un scénario désactivé ou saturé, le message est seulement mis en file
    // d'attente et ne partira que plus tard, voire jamais. Ce n'est pas un envoi.
    if (corps.trim() === "Accepted") {
      return { ok: false, error: "Le scénario Make est désactivé : le message est en file d'attente, il n'a pas été envoyé." };
    }
    try {
      const reponse: unknown = JSON.parse(corps);
      if (typeof reponse === "object" && reponse !== null && "ok" in reponse && reponse.ok === false) {
        const detail = "error" in reponse ? String(reponse.error) : "";
        return { ok: false, error: `Make n'a pas pu envoyer l'e-mail. ${detail}`.trim() };
      }
    } catch {
      // Autre réponse non JSON : le statut HTTP fait foi.
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Envoi impossible." };
  }
}

export const envoyeursReels: Envoyeurs = {
  email(to, sujet, texte, piecesJointes) {
    return process.env.EMAIL_FOURNISSEUR === "make"
      ? emailParMake(to, sujet, texte, piecesJointes)
      : emailParResend(to, sujet, texte, piecesJointes);
  },

  async whatsappApi(telephone, parametres) {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const modele = process.env.WHATSAPP_TEMPLATE_NAME;
    if (!token || !phoneId || !modele) {
      return {
        ok: false,
        error: "API WhatsApp non configurée (WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_TEMPLATE_NAME).",
      };
    }
    return appeler(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: telephone,
        type: "template",
        template: {
          name: modele,
          language: { code: process.env.WHATSAPP_TEMPLATE_LANG ?? "fr" },
          components: [
            { type: "body", parameters: parametres.map((text) => ({ type: "text", text })) },
          ],
        },
      }),
    });
  },
};
