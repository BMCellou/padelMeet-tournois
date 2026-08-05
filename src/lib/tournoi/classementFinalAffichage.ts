// Assemble les données nécessaires au classement final affiché (admin et
// page publique) à partir des matchs de tableau déjà chargés, et applique
// classementFinal (§4.9). Pure : ne fait aucun accès base lui-même.

import { classementFinal } from "@/lib/engine/classementFinal";

export interface StandingRow {
  team_id: string;
  joues: number;
  v: number;
  ratio_sets: number | null;
  ratio_jeux: number | null;
  rang: number | null;
}

export interface LigneFinale {
  rang: number;
  equipeNom: string;
}

interface MatchTableauBrut {
  round: number;
  team_a_id: string | null;
  team_b_id: string | null;
  winner_id: string | null;
  statut: string;
  next_match_id: string | null;
}

function ratioVictoires(s: StandingRow | undefined): number {
  return s && s.joues > 0 ? s.v / s.joues : 0;
}

export function trierParRatio(ids: string[], standings: Map<string, StandingRow>): string[] {
  return [...ids].sort((a, b) => {
    const sa = standings.get(a);
    const sb = standings.get(b);
    const rv = ratioVictoires(sb) - ratioVictoires(sa);
    if (rv !== 0) return rv;
    const rs = (sb?.ratio_sets ?? 0) - (sa?.ratio_sets ?? 0);
    if (rs !== 0) return rs;
    return (sb?.ratio_jeux ?? 0) - (sa?.ratio_jeux ?? 0);
  });
}

export function calculerClassementFinalTableau(
  matchsTableau: MatchTableauBrut[],
  toutesLesEquipesIds: string[],
  standingsParEquipe: Map<string, StandingRow>,
  nomEquipe: Map<string, string>,
): LigneFinale[] | null {
  if (matchsTableau.length === 0) return null;

  const tours = [...new Set(matchsTableau.map((m) => m.round))].sort((a, b) => a - b);
  const dernierTour = tours[tours.length - 1];
  const finale = matchsTableau.find((m) => m.round === dernierTour && !m.next_match_id);
  const finaleTerminee = finale && (finale.statut === "valide" || finale.statut === "forfait");

  if (!finaleTerminee || !finale) return null;

  const champion = finale.winner_id!;
  const finaliste = finale.team_a_id === champion ? finale.team_b_id! : finale.team_a_id!;

  const demis = matchsTableau.filter((m) => m.round === dernierTour - 1);
  const demiPerdants = demis.map((m) => (m.winner_id === m.team_a_id ? m.team_b_id! : m.team_a_id!));

  const quarts = dernierTour >= 3 ? matchsTableau.filter((m) => m.round === dernierTour - 2) : [];
  const quartsPerdants = quarts.map((m) => (m.winner_id === m.team_a_id ? m.team_b_id! : m.team_a_id!));

  const idsQualifies = new Set(
    matchsTableau.flatMap((m) => [m.team_a_id, m.team_b_id]).filter((id): id is string => !!id),
  );
  const nonQualifies = toutesLesEquipesIds.filter((id) => !idsQualifies.has(id));

  const resultat = classementFinal({
    finaleVainqueurId: champion,
    finalePerdantId: finaliste,
    demiFinalesPerdantIds: demiPerdants,
    quartsPerdantIdsTries: trierParRatio(quartsPerdants, standingsParEquipe),
    nonQualifieIdsTries: trierParRatio(nonQualifies, standingsParEquipe),
  });

  return resultat.map((e) => ({ rang: e.rang, equipeNom: nomEquipe.get(e.teamId) ?? "?" }));
}
