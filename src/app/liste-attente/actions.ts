"use server";

import { after } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getParticipantConnecte } from "@/lib/participant/session";
import { donneesDepuisProfil } from "@/lib/liste-attente/compte";
import { messageConfirmation } from "@/lib/liste-attente/message";
import { DUREE_CONSERVATION_MOIS } from "@/lib/liste-attente/rgpd";
import { URL_SITE } from "@/lib/legal/editeur";
import { envoyeursReels } from "@/lib/rappels/envoi";
import { inscriptionListeAttenteSchema, VERSION_RGPD, type InscriptionListeAttente } from "@/lib/liste-attente/validation";

/** Saisie renvoyée avec une erreur : React vide le formulaire après chaque envoi, on la remet pour ne rien retaper. */
export type Valeurs = Record<string, string>;
type ActionResult = { error: string; valeurs?: Valeurs } | { success: true };

function valeursSaisies(formData: FormData, champs: string[]): Valeurs {
  return Object.fromEntries(champs.map((c) => [c, String(formData.get(c) ?? "")]));
}

const CHAMPS_PUBLIC = ["prenom", "nom", "email", "telephone", "niveau", "ville", "consentement"];
const CHAMPS_CONNECTE = ["telephone", "niveau", "ville", "consentement"];

/** Plafond d'inscriptions par heure, tous visiteurs confondus : freine un robot sans stocker d'adresse IP. */
const INSCRIPTIONS_MAX_PAR_HEURE = 60;

/**
 * Inscription publique à la liste d'attente : aucun compte, aucune lecture. Écrit avec le client service_role
 * (la table n'a aucune politique publique). Une adresse déjà inscrite reçoit la même réponse qu'une nouvelle :
 * on ne révèle jamais qui figure sur la liste, et on n'écrase jamais les informations d'une ligne existante.
 */
export async function sInscrireListeAttente(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  // Champ piège invisible : un robot le remplit, une personne jamais. On répond comme si c'était réussi.
  if (String(formData.get("site") ?? "") !== "") return { success: true };

  const parsed = inscriptionListeAttenteSchema.safeParse({
    prenom: formData.get("prenom"),
    nom: formData.get("nom"),
    email: formData.get("email"),
    telephone: formData.get("telephone"),
    niveau: formData.get("niveau") || undefined,
    ville: formData.get("ville") ?? "",
    consentement: formData.get("consentement") ?? undefined,
  });
  const valeurs = valeursSaisies(formData, CHAMPS_PUBLIC);
  if (!parsed.success) return { error: parsed.error.issues[0].message, valeurs };
  return enregistrer(parsed.data, valeurs);
}

/**
 * Enregistre une inscription déjà validée : plafond horaire, puis insertion. Une adresse déjà inscrite reçoit la
 * même réponse qu'une nouvelle : on ne révèle jamais qui figure sur la liste, et on n'écrase jamais les informations
 * d'une ligne existante.
 */
async function enregistrer(donnees: InscriptionListeAttente, valeurs: Valeurs): Promise<ActionResult> {
  const service = createServiceClient();

  const depuis = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await service
    .from("liste_attente")
    .select("id", { count: "exact", head: true })
    .gte("created_at", depuis);
  if ((count ?? 0) >= INSCRIPTIONS_MAX_PAR_HEURE) {
    return { error: "Beaucoup de demandes en ce moment : réessaie dans quelques minutes.", valeurs };
  }

  const { prenom, nom, email, telephone, niveau, ville } = donnees;
  const { data: creee, error } = await service
    .from("liste_attente")
    .insert({ prenom, nom, email, telephone, niveau, ville, consentement_version: VERSION_RGPD })
    .select("token_desinscription")
    .single();

  // 23505 : adresse déjà inscrite (index unique sur lower(email)) — même réponse qu'un succès, et aucun e-mail :
  // on ne renvoie rien à une adresse déjà connue (pas d'envoi en rafale vers la boîte de quelqu'un d'autre).
  if (error) {
    if (error.code === "23505") return { success: true };
    return { error: "Impossible de t'inscrire pour le moment. Réessaie dans un instant.", valeurs };
  }

  // E-mail de confirmation, après la réponse : un échec d'envoi ne doit jamais faire échouer l'inscription.
  const token = creee.token_desinscription;
  after(async () => {
    const message = messageConfirmation(prenom, process.env.NEXT_PUBLIC_SITE_URL || URL_SITE, token, DUREE_CONSERVATION_MOIS);
    const r = await envoyeursReels.email(email, message.sujet, message.texte).catch(() => null);
    if (!r?.ok) console.error("Liste d'attente : e-mail de confirmation non envoyé.", r?.error ?? "");
  });
  return { success: true };
}

/**
 * Inscription en un clic d'une personne connectée : son identité (prénom, nom, e-mail, et téléphone s'il est au
 * profil) vient de la session, jamais du formulaire. Elle choisit son niveau et donne son consentement.
 */
export async function sInscrireListeAttenteConnecte(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const participant = await getParticipantConnecte();
  const valeurs = valeursSaisies(formData, CHAMPS_CONNECTE);
  if (!participant?.email) return { error: "Connecte-toi pour t'inscrire en un clic, ou remplis le formulaire.", valeurs };

  const parsed = inscriptionListeAttenteSchema.safeParse(
    donneesDepuisProfil(
      { prenom: participant.prenom, nom: participant.nom, email: participant.email, telephone: participant.telephone },
      {
        telephone: formData.get("telephone") ?? "",
        niveau: formData.get("niveau") || undefined,
        ville: formData.get("ville") ?? "",
        consentement: formData.get("consentement") ?? undefined,
      },
    ),
  );
  if (!parsed.success) return { error: parsed.error.issues[0].message, valeurs };
  return enregistrer(parsed.data, valeurs);
}
