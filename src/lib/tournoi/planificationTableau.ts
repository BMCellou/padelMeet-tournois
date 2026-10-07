// Place les matchs de la phase finale (tableau, 3e et 5e place) sur les
// terrains du tournoi, à la suite des poules — voir planifierTableau dans
// src/lib/engine/planification.ts. Appelé à chaque (ré)génération du
// tableau (automatique ou depuis l'écran Qualifiés) et depuis le bouton
// « Replanifier le tableau final » du calendrier.

import type { createClient } from "@/lib/supabase/server";
import { planifierTableau, type OccupationExistante } from "@/lib/engine/planification";
import { heureLocaleVersISO } from "@/lib/temps";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type ResultatPlanification =
  | { ok: true; nbMatchs: number }
  | { ok: false; raison: "aucun_terrain" | "aucun_match" | "tableau_joue"; message: string };

const PHASES_FINALES = ["tableau", "classement", "classement_5e"] as const;
type PhaseFinale = (typeof PHASES_FINALES)[number];

export async function planifierTableauFinal(
  supabase: SupabaseServerClient,
  tournamentId: string,
): Promise<ResultatPlanification> {
  const [{ data: tournoi }, { data: liens }, { data: matchs }] = await Promise.all([
    supabase
      .from("tournaments")
      .select("date, heure_debut, duree_match_min, pause_min, repos_min_min")
      .eq("id", tournamentId)
      .single(),
    supabase.from("tournament_courts").select("courts(id, ordre)").eq("tournament_id", tournamentId),
    supabase
      .from("matches")
      .select("id, phase, round, bracket_slot, team_a_id, team_b_id, court_id, scheduled_at, duree_estimee, statut")
      .eq("tournament_id", tournamentId),
  ]);

  const courts = (liens ?? [])
    .map((l) => l.courts)
    .filter((c): c is { id: string; ordre: number } => !!c);
  if (!tournoi || courts.length === 0) {
    return { ok: false, raison: "aucun_terrain", message: "Aucun terrain assigné à ce tournoi." };
  }

  const finaux = (matchs ?? []).filter((m) => (PHASES_FINALES as readonly string[]).includes(m.phase));
  if (finaux.length === 0) {
    return { ok: false, raison: "aucun_match", message: "Le tableau final n'a pas encore été généré." };
  }
  if (finaux.some((m) => m.statut === "valide" || m.statut === "forfait")) {
    return {
      ok: false,
      raison: "tableau_joue",
      message: "Un match du tableau final est déjà validé : impossible de le replanifier.",
    };
  }

  const dureeJeuMin = tournoi.duree_match_min ?? 25;
  const existants: OccupationExistante[] = (matchs ?? [])
    .filter((m) => m.phase === "poule" && m.court_id && m.scheduled_at)
    .map((m) => ({
      courtId: m.court_id!,
      debut: m.scheduled_at!,
      fin: new Date(new Date(m.scheduled_at!).getTime() + (m.duree_estimee ?? dureeJeuMin) * 60_000).toISOString(),
      teamAId: m.team_a_id,
      teamBId: m.team_b_id,
    }));

  const planning = planifierTableau(
    finaux.map((m) => ({
      id: m.id,
      phase: m.phase as PhaseFinale,
      round: m.round,
      bracketSlot: m.bracket_slot,
      teamAId: m.team_a_id,
      teamBId: m.team_b_id,
    })),
    courts,
    {
      heureDebut: heureLocaleVersISO(tournoi.date, tournoi.heure_debut.slice(0, 5)),
      dureeJeuMin,
      rotationMin: tournoi.pause_min ?? 5,
      reposMinMin: tournoi.repos_min_min,
    },
    existants,
  );

  for (const p of planning) {
    await supabase
      .from("matches")
      .update({ court_id: p.courtId, scheduled_at: p.debut, duree_estimee: dureeJeuMin })
      .eq("id", p.matchId);
  }

  return { ok: true, nbMatchs: planning.length };
}
