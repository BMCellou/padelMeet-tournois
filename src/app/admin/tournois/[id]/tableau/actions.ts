"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { selectionnerQualifies, type ClassementPoule } from "@/lib/engine/qualification";
import { genererTableau, type Qualifie, type MatchTableau } from "@/lib/engine/tableau";

type ActionResult = { error: string } | { success: true };

export async function genererTableauFinal(tournamentId: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { data: tournoi } = await supabase
    .from("tournaments")
    .select("id, nb_qualifies")
    .eq("id", tournamentId)
    .single();

  if (!tournoi) return { error: "Tournoi introuvable." };
  if (!tournoi.nb_qualifies) {
    return { error: "Nombre de qualifiés non défini pour ce tournoi." };
  }

  const { data: groupes } = await supabase
    .from("groups")
    .select("id")
    .eq("tournament_id", tournamentId);

  if (!groupes || groupes.length === 0) {
    return { error: "Tire d'abord les poules." };
  }
  if (groupes.length === 1) {
    return {
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
    return { error: "Termine d'abord tous les matchs de poule." };
  }

  const { data: standingsBrutes } = await supabase
    .from("standings")
    .select("group_id, team_id, joues, v, d, sets_g, sets_p, jeux_g, jeux_p, ratio_sets, ratio_jeux, rang")
    .eq("tournament_id", tournamentId);

  const classementsParPoule: ClassementPoule[] = groupes.map((g) => ({
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

  const qualification = selectionnerQualifies(classementsParPoule, tournoi.nb_qualifies);
  if (qualification.qualifies.length < 2) {
    return { error: "Pas assez d'équipes qualifiables pour un tableau." };
  }

  const groupIdParEquipe = new Map<string, string>();
  for (const cp of classementsParPoule) {
    for (const e of cp.equipes) groupIdParEquipe.set(e.teamId, cp.groupId);
  }

  const qualifies: Qualifie[] = qualification.qualifies.map((teamId) => ({
    teamId,
    groupId: groupIdParEquipe.get(teamId)!,
  }));

  let bracket: MatchTableau[];
  try {
    bracket = genererTableau(qualifies);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Impossible de générer le tableau." };
  }

  const { data: matchsTableauExistants } = await supabase
    .from("matches")
    .select("id, statut")
    .eq("tournament_id", tournamentId)
    .eq("phase", "tableau");

  if (matchsTableauExistants?.some((m) => m.statut !== "a_venir")) {
    return { error: "Des scores du tableau final ont déjà été saisis : impossible de régénérer." };
  }

  if (matchsTableauExistants && matchsTableauExistants.length > 0) {
    await supabase.from("matches").delete().eq("tournament_id", tournamentId).eq("phase", "tableau");
  }

  // Insertion en deux passes : les lignes d'abord, puis le câblage
  // next_match_id (qui référence les ids réels générés à la première passe).
  const idParSynthetique = new Map<string, string>();

  for (const m of bracket) {
    const { data: inserted, error } = await supabase
      .from("matches")
      .insert({
        tournament_id: tournamentId,
        phase: "tableau",
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
    if (!m.nextMatchId) continue;
    const idReel = idParSynthetique.get(m.id)!;
    const idSuivantReel = idParSynthetique.get(m.nextMatchId)!;
    await supabase
      .from("matches")
      .update({ next_match_id: idSuivantReel, next_slot: m.nextSlot })
      .eq("id", idReel);
  }

  revalidatePath(`/admin/tournois/${tournamentId}/tableau`);
  return { success: true };
}
