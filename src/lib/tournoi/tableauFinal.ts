// Génération du tableau final — partagée entre l'action manuelle
// (bouton "Générer le tableau final") et le déclenchement automatique
// dès que le dernier match de poule est validé (voir
// src/app/admin/tournois/[id]/scores/actions.ts). Les deux chemins
// doivent produire exactement le même tableau à partir des mêmes
// qualifiés : toute la logique vit ici, une seule fois.

import type { createClient } from "@/lib/supabase/server";
import { selectionnerQualifies, type ClassementPoule } from "@/lib/engine/qualification";
import { genererTableau, type Qualifie } from "@/lib/engine/tableau";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type ResultatAction = { error: string } | { success: true };

/** Une équipe d'une poule, avec son statut de qualification — sert à la
 * fois à calculer les qualifiés automatiques et à afficher l'écran de
 * repêchage manuel (src/app/admin/tournois/[id]/tableau/QualifiesEditor.tsx). */
export interface EquipePoule {
  teamId: string;
  groupId: string;
  groupNom: string;
  equipeNom: string;
  rang: number | null;
  qualifieAuto: boolean;
}

export interface ContexteQualification {
  tailleTableau: number;
  avertissement?: string;
  equipes: EquipePoule[];
}

/** Vérifie que les poules sont prêtes pour un tableau : au moins deux
 * poules tirées, tous les matchs de poule terminés (validés ou
 * forfaits), et un nombre de qualifiés défini sur le tournoi. */
export async function verifierPoulesTerminees(
  supabase: SupabaseServerClient,
  tournamentId: string,
): Promise<{ ok: true; nbQualifies: number } | { ok: false; error: string }> {
  const { data: tournoi } = await supabase
    .from("tournaments")
    .select("nb_qualifies")
    .eq("id", tournamentId)
    .single();

  if (!tournoi) return { ok: false, error: "Tournoi introuvable." };
  if (!tournoi.nb_qualifies) {
    return { ok: false, error: "Nombre de qualifiés non défini pour ce tournoi." };
  }

  const { data: groupes } = await supabase.from("groups").select("id").eq("tournament_id", tournamentId);

  if (!groupes || groupes.length === 0) {
    return { ok: false, error: "Tire d'abord les poules." };
  }
  if (groupes.length === 1) {
    return {
      ok: false,
      error: "Une seule poule : pas de tableau, le classement de poule est le classement final.",
    };
  }

  const { data: matchsPoule } = await supabase
    .from("matches")
    .select("id, statut")
    .eq("tournament_id", tournamentId)
    .eq("phase", "poule");

  if (
    !matchsPoule ||
    matchsPoule.length === 0 ||
    matchsPoule.some((m) => m.statut !== "valide" && m.statut !== "forfait")
  ) {
    return { ok: false, error: "Termine d'abord tous les matchs de poule." };
  }

  return { ok: true, nbQualifies: tournoi.nb_qualifies };
}

/**
 * Calcule le contexte complet de qualification : toutes les équipes de
 * poule avec leur rang et si elles sont qualifiées par la sélection
 * automatique — sert autant à l'auto-génération qu'à l'écran de
 * repêchage manuel.
 */
export async function calculerContexteQualification(
  supabase: SupabaseServerClient,
  tournamentId: string,
): Promise<{ error: string } | ContexteQualification> {
  const pret = await verifierPoulesTerminees(supabase, tournamentId);
  if (!pret.ok) return { error: pret.error };

  const { data: groupes } = await supabase
    .from("groups")
    .select("id, nom")
    .eq("tournament_id", tournamentId);

  const { data: teams } = await supabase
    .from("teams")
    .select("id, nom_affiche")
    .eq("tournament_id", tournamentId);
  const nomEquipe = new Map((teams ?? []).map((t) => [t.id, t.nom_affiche]));

  const { data: standingsBrutes } = await supabase
    .from("standings")
    .select("group_id, team_id, joues, v, d, sets_g, sets_p, jeux_g, jeux_p, ratio_sets, ratio_jeux, rang")
    .eq("tournament_id", tournamentId);

  const classementsParPoule: ClassementPoule[] = (groupes ?? []).map((g) => ({
    groupId: g.id,
    equipes: (standingsBrutes ?? [])
      .filter((s) => s.group_id === g.id)
      .map((s) => ({
        teamId: s.team_id,
        joues: s.joues,
        v: s.v,
        d: s.d,
        setsG: s.sets_g,
        setsP: s.sets_p,
        jeuxG: s.jeux_g,
        jeuxP: s.jeux_p,
        ratioSets: s.ratio_sets ?? 0,
        ratioJeux: s.ratio_jeux ?? 0,
        rang: s.rang ?? 0,
      })),
  }));

  const qualification = selectionnerQualifies(classementsParPoule, pret.nbQualifies);
  const qualifiesIds = new Set(qualification.qualifies);

  const groupNomParId = new Map((groupes ?? []).map((g) => [g.id, g.nom]));

  const equipes: EquipePoule[] = (standingsBrutes ?? []).map((s) => ({
    teamId: s.team_id,
    groupId: s.group_id!,
    groupNom: groupNomParId.get(s.group_id!) ?? "?",
    equipeNom: nomEquipe.get(s.team_id) ?? "?",
    rang: s.rang,
    qualifieAuto: qualifiesIds.has(s.team_id),
  }));

  equipes.sort((a, b) => a.groupNom.localeCompare(b.groupNom) || (a.rang ?? 0) - (b.rang ?? 0));

  return { tailleTableau: qualification.tailleTableau, avertissement: qualification.avertissement, equipes };
}

/**
 * Génère et persiste le tableau final à partir d'une liste explicite de
 * qualifiés (calculée automatiquement, ou choisie à la main sur l'écran
 * de repêchage — le code ne fait pas la différence). Bloque si le
 * tableau existant a déjà été entamé.
 */
export async function genererTableauAvecQualifies(
  supabase: SupabaseServerClient,
  tournamentId: string,
  qualifies: Qualifie[],
): Promise<ResultatAction> {
  if (qualifies.length < 2 || (qualifies.length & (qualifies.length - 1)) !== 0) {
    return { error: `Le nombre de qualifiés doit être une puissance de 2 (reçu ${qualifies.length}).` };
  }

  let bracket;
  try {
    bracket = genererTableau(qualifies);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Impossible de générer le tableau." };
  }

  // "classement" = la petite finale générée à côté du tableau principal
  // (voir genererTableau) : traitée comme partie intégrante du même
  // tableau pour la détection "déjà entamé" et la régénération.
  const { data: matchsTableauExistants } = await supabase
    .from("matches")
    .select("id, statut")
    .eq("tournament_id", tournamentId)
    .in("phase", ["tableau", "classement"]);

  if (matchsTableauExistants?.some((m) => m.statut !== "a_venir")) {
    return { error: "Des scores du tableau final ont déjà été saisis : impossible de régénérer." };
  }

  if (matchsTableauExistants && matchsTableauExistants.length > 0) {
    await supabase
      .from("matches")
      .delete()
      .eq("tournament_id", tournamentId)
      .in("phase", ["tableau", "classement"]);
  }

  // Insertion en deux passes : les lignes d'abord, puis le câblage
  // next_match_id/loser_next_match_id (qui référencent les ids réels
  // générés à la première passe).
  const idParSynthetique = new Map<string, string>();

  for (const m of bracket) {
    const { data: inserted, error } = await supabase
      .from("matches")
      .insert({
        tournament_id: tournamentId,
        phase: m.phase,
        round: m.round,
        bracket_slot: m.bracketSlot,
        team_a_id: m.teamAId,
        team_b_id: m.teamBId,
        statut: "a_venir",
      })
      .select("id")
      .single();

    if (error || !inserted) return { error: "Impossible de créer le tableau." };
    idParSynthetique.set(m.id, inserted.id);
  }

  for (const m of bracket) {
    const idReel = idParSynthetique.get(m.id)!;
    if (m.nextMatchId) {
      await supabase
        .from("matches")
        .update({ next_match_id: idParSynthetique.get(m.nextMatchId)!, next_slot: m.nextSlot! })
        .eq("id", idReel);
    }
    if (m.loserNextMatchId) {
      await supabase
        .from("matches")
        .update({
          loser_next_match_id: idParSynthetique.get(m.loserNextMatchId)!,
          loser_next_slot: m.loserNextSlot!,
        })
        .eq("id", idReel);
    }
  }

  return { success: true };
}

/**
 * Tente la génération automatique du tableau final dès que les poules
 * sont terminées — appelée après chaque validation/forfait de match de
 * poule (voir scores/actions.ts). Best-effort et silencieuse : si les
 * conditions ne sont pas réunies (poules pas finies, tableau déjà
 * généré, nombre de qualifiés non défini...), elle ne fait simplement
 * rien plutôt que de faire échouer la validation du score en cours.
 */
export async function tenterGenerationAutomatique(
  supabase: SupabaseServerClient,
  tournamentId: string,
): Promise<void> {
  const { data: tableauExistant } = await supabase
    .from("matches")
    .select("id")
    .eq("tournament_id", tournamentId)
    .eq("phase", "tableau")
    .limit(1);

  if (tableauExistant && tableauExistant.length > 0) return;

  const contexte = await calculerContexteQualification(supabase, tournamentId);
  if ("error" in contexte) return;

  const qualifies: Qualifie[] = contexte.equipes
    .filter((e) => e.qualifieAuto)
    .map((e) => ({ teamId: e.teamId, groupId: e.groupId }));

  if (qualifies.length !== contexte.tailleTableau) return;

  await genererTableauAvecQualifies(supabase, tournamentId, qualifies);
}
