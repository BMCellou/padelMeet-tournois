// Garde-fou des corrections de score d'un match de poule une fois le tableau
// final généré : une correction peut changer le classement, donc la liste
// des qualifiés, alors que le tableau est déjà en place. Voir
// src/lib/engine/impactQualifies.ts pour la règle.

import type { createClient } from "@/lib/supabase/server";
import type { CritereDepartage } from "@/lib/engine/classement";
import type { SetSaisi } from "@/lib/engine/score";
import {
  decisionCorrection,
  impactSurQualifies,
  messageRefusCorrection,
  type DecisionCorrection,
  type ImpactQualifies,
} from "@/lib/engine/impactQualifies";
import { matchCommence } from "@/lib/engine/formatPhases";
import { classementDuGroupe } from "./classementPoule";
import { classementsDepuisStandings } from "./tableauFinal";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export interface ResultatEvaluation {
  decision: DecisionCorrection;
  /** Null quand il n'y a pas de tableau (rien à comparer). */
  impact: ImpactQualifies | null;
  /** Message d'erreur à afficher quand la décision est « refuser ». */
  message: string | null;
}

export interface CorrectionPoule {
  matchId: string;
  groupId: string;
  vainqueurId: string;
  forfait: boolean;
  sets: SetSaisi[];
}

/**
 * Évalue, sans rien écrire, ce que ferait cette correction aux qualifiés :
 * classements stockés (avant) contre classement recalculé de la poule avec
 * le nouveau résultat (après).
 */
export async function evaluerCorrectionPoule(
  supabase: SupabaseServerClient,
  tournamentId: string,
  correction: CorrectionPoule,
  tiebreakRules: CritereDepartage[],
): Promise<ResultatEvaluation> {
  const [{ data: tournoi }, { data: matchsFinaux }] = await Promise.all([
    supabase.from("tournaments").select("nb_qualifies, selection_manuelle").eq("id", tournamentId).single(),
    supabase
      .from("matches")
      .select("phase, statut")
      .eq("tournament_id", tournamentId)
      .in("phase", ["tableau", "classement", "classement_5e"]),
  ]);

  const tableauExiste = (matchsFinaux ?? []).some((m) => m.phase === "tableau");
  if (!tournoi || !tableauExiste || !tournoi.nb_qualifies) {
    return { decision: "appliquer", impact: null, message: null };
  }

  const [{ data: groupes }, { data: standings }, { data: teams }] = await Promise.all([
    supabase.from("groups").select("id").eq("tournament_id", tournamentId),
    supabase
      .from("standings")
      .select("group_id, team_id, joues, v, d, sets_g, sets_p, jeux_g, jeux_p, ratio_sets, ratio_jeux, rang")
      .eq("tournament_id", tournamentId),
    supabase.from("teams").select("id, nom_affiche").eq("tournament_id", tournamentId),
  ]);

  const classementsAvant = classementsDepuisStandings((groupes ?? []).map((g) => g.id), standings ?? []);
  const classementApres = await classementDuGroupe(supabase, correction.groupId, tiebreakRules, {
    matchId: correction.matchId,
    vainqueurId: correction.vainqueurId,
    forfait: correction.forfait,
    sets: correction.sets,
  });
  const classementsApres = classementsAvant.map((c) =>
    c.groupId === correction.groupId ? { ...c, equipes: classementApres } : c,
  );

  const impact = impactSurQualifies(
    { classementsParPoule: classementsAvant, nbQualifies: tournoi.nb_qualifies },
    { classementsParPoule: classementsApres, nbQualifies: tournoi.nb_qualifies },
  );

  const decision = decisionCorrection(impact, {
    tableauExiste,
    tableauCommence: (matchsFinaux ?? []).some((m) => matchCommence(m.statut)),
    selectionManuelle: tournoi.selection_manuelle,
  });

  const nomEquipe = new Map((teams ?? []).map((t) => [t.id, t.nom_affiche]));
  return {
    decision,
    impact,
    message: decision === "refuser" ? messageRefusCorrection(impact, (id) => nomEquipe.get(id) ?? "?") : null,
  };
}
