"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { getParticipantConnecte } from "@/lib/participant/session";
import { donneesDepuisProfil } from "@/lib/liste-attente/compte";
import { inscriptionListeAttenteSchema, VERSION_RGPD, type InscriptionListeAttente } from "@/lib/liste-attente/validation";

type ActionResult = { error: string } | { success: true };

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
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  return enregistrer(parsed.data);
}

/**
 * Enregistre une inscription déjà validée : plafond horaire, puis insertion. Une adresse déjà inscrite reçoit la
 * même réponse qu'une nouvelle : on ne révèle jamais qui figure sur la liste, et on n'écrase jamais les informations
 * d'une ligne existante.
 */
async function enregistrer(donnees: InscriptionListeAttente): Promise<ActionResult> {
  const service = createServiceClient();

  const depuis = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await service
    .from("liste_attente")
    .select("id", { count: "exact", head: true })
    .gte("created_at", depuis);
  if ((count ?? 0) >= INSCRIPTIONS_MAX_PAR_HEURE) {
    return { error: "Beaucoup de demandes en ce moment : réessaie dans quelques minutes." };
  }

  const { prenom, nom, email, telephone, niveau, ville } = donnees;
  const { error } = await service
    .from("liste_attente")
    .insert({ prenom, nom, email, telephone, niveau, ville, consentement_version: VERSION_RGPD });

  // 23505 : adresse déjà inscrite (index unique sur lower(email)) — même réponse qu'un succès.
  if (error && error.code !== "23505") return { error: "Impossible de t'inscrire pour le moment. Réessaie dans un instant." };
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
  if (!participant?.email) return { error: "Connecte-toi pour t'inscrire en un clic, ou remplis le formulaire." };

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
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  return enregistrer(parsed.data);
}
