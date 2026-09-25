// Envoi réel des rappels : e-mail via Resend, WhatsApp via l'API Cloud de
// Meta (modèle de message approuvé). Un seul endroit à adapter si le
// prestataire change. Aucune dépendance : simple `fetch`.

export type ResultatEnvoi = { ok: true } | { ok: false; error: string };

export interface Envoyeurs {
  email(to: string, sujet: string, texte: string): Promise<ResultatEnvoi>;
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

export const envoyeursReels: Envoyeurs = {
  async email(to, sujet, texte) {
    const cle = process.env.RESEND_API_KEY;
    const from = process.env.RESEND_FROM;
    if (!cle || !from) return { ok: false, error: "E-mail non configuré (RESEND_API_KEY / RESEND_FROM)." };
    return appeler("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${cle}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject: sujet, text: texte }),
    });
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
