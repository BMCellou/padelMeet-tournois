// Classement d'une poule à partir des matchs terminés (validés ou forfaits),
// et sa persistance dans `standings`. Partagé entre la validation / correction
// des scores et le calcul de l'impact d'une correction sur les qualifiés.

import type { createClient } from "@/lib/supabase/server";
import { calculerClassement, type CritereDepartage, type EquipeClassee, type MatchTermine } from "@/lib/engine/classement";
import type { SetSaisi } from "@/lib/engine/score";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

interface LigneMatch {
  id?: string;
  team_a_id: string | null;
  team_b_id: string | null;
  winner_id: string | null;
  statut: string;
  match_sets: { jeux_a: number; jeux_b: number; tiebreak_a: number | null; tiebreak_b: number | null }[];
}

export function versMatchTermine(m: LigneMatch): MatchTermine {
  if (m.statut === "forfait") {
    return {
      teamAId: m.team_a_id!,
      teamBId: m.team_b_id!,
      vainqueurId: m.winner_id!,
      setsA: 0,
      setsB: 0,
      jeuxA: 0,
      jeuxB: 0,
    };
  }

  let setsA = 0;
  let setsB = 0;
  let jeuxA = 0;
  let jeuxB = 0;

  for (const s of m.match_sets) {
    jeuxA += s.jeux_a;
    jeuxB += s.jeux_b;
    if (s.jeux_a > s.jeux_b) setsA++;
    else if (s.jeux_b > s.jeux_a) setsB++;
    else if (s.tiebreak_a != null && s.tiebreak_b != null) {
      if (s.tiebreak_a > s.tiebreak_b) setsA++;
      else if (s.tiebreak_b > s.tiebreak_a) setsB++;
    }
  }

  return { teamAId: m.team_a_id!, teamBId: m.team_b_id!, vainqueurId: m.winner_id!, setsA, setsB, jeuxA, jeuxB };
}

/** Résultat hypothétique d'un match, pour calculer un classement « après correction » sans rien écrire. */
export interface RemplacementMatch {
  matchId: string;
  vainqueurId: string;
  forfait: boolean;
  sets: SetSaisi[];
}

export async function classementDuGroupe(
  supabase: SupabaseServerClient,
  groupId: string,
  tiebreakRules: CritereDepartage[],
  remplacement?: RemplacementMatch,
): Promise<EquipeClassee[]> {
  const { data: groupTeams } = await supabase.from("group_teams").select("team_id").eq("group_id", groupId);
  const equipeIds = (groupTeams ?? []).map((g) => g.team_id);

  const { data: termines } = await supabase
    .from("matches")
    .select("id, team_a_id, team_b_id, winner_id, statut, match_sets(jeux_a, jeux_b, tiebreak_a, tiebreak_b)")
    .eq("group_id", groupId)
    .in("statut", ["valide", "forfait"]);

  const lignes: LigneMatch[] = (termines ?? []).map((m) => {
    if (remplacement && m.id === remplacement.matchId) {
      return {
        ...m,
        winner_id: remplacement.vainqueurId,
        statut: remplacement.forfait ? "forfait" : "valide",
        match_sets: remplacement.sets.map((s) => ({
          jeux_a: s.jeuxA,
          jeux_b: s.jeuxB,
          tiebreak_a: s.tiebreakA ?? null,
          tiebreak_b: s.tiebreakB ?? null,
        })),
      };
    }
    return m;
  });

  return calculerClassement(lignes.map(versMatchTermine), equipeIds, tiebreakRules);
}

export async function recalculerClassementPoule(
  supabase: SupabaseServerClient,
  tournamentId: string,
  groupId: string,
  tiebreakRules: CritereDepartage[],
): Promise<void> {
  const classement = await classementDuGroupe(supabase, groupId, tiebreakRules);

  await supabase.from("standings").delete().eq("group_id", groupId);
  if (classement.length > 0) {
    await supabase.from("standings").insert(
      classement.map((e) => ({
        tournament_id: tournamentId,
        group_id: groupId,
        team_id: e.teamId,
        joues: e.joues,
        v: e.v,
        d: e.d,
        sets_g: e.setsG,
        sets_p: e.setsP,
        jeux_g: e.jeuxG,
        jeux_p: e.jeuxP,
        ratio_sets: e.ratioSets,
        ratio_jeux: e.ratioJeux,
        rang: e.rang,
      })),
    );
  }
}
