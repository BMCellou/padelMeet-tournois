"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { inscriptionListeAttenteSchema, VERSION_RGPD } from "@/lib/liste-attente/validation";

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

  const service = createServiceClient();

  const depuis = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await service
    .from("liste_attente")
    .select("id", { count: "exact", head: true })
    .gte("created_at", depuis);
  if ((count ?? 0) >= INSCRIPTIONS_MAX_PAR_HEURE) {
    return { error: "Beaucoup de demandes en ce moment : réessaie dans quelques minutes." };
  }

  const { prenom, nom, email, telephone, niveau, ville } = parsed.data;
  const { error } = await service
    .from("liste_attente")
    .insert({ prenom, nom, email, telephone, niveau, ville, consentement_version: VERSION_RGPD });

  // 23505 : adresse déjà inscrite (index unique sur lower(email)) — même réponse qu'un succès.
  if (error && error.code !== "23505") return { error: "Impossible de t'inscrire pour le moment. Réessaie dans un instant." };
  return { success: true };
}
