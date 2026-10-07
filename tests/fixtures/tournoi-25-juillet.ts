// Scénario de référence : 14 équipes, poules 5/5/4, 3 terrains, tableau de 8
// (2 premiers de chaque poule + 2 meilleurs 3es), avec match pour la 3e place.
// Mêmes paramètres que tournoi-25-juillet.test.ts.

import type { CritereDepartage, MatchTermine } from "@/lib/engine/classement";
import type { Scenario } from "./scenario";

export const CRITERES_14: CritereDepartage[] = [
  "victoires",
  "confrontation_directe",
  "mini_classement",
  "ratio_sets",
  "ratio_jeux",
];

function numeroDe(teamId: string): number {
  return Number(teamId.replace("equipe", ""));
}

/** Le numéro le plus bas gagne ; l'écart de numéros fixe le score du perdant. */
export function simulerMatchParNumero(teamAId: string, teamBId: string): MatchTermine {
  const na = numeroDe(teamAId);
  const nb = numeroDe(teamBId);
  const aGagne = na < nb;
  const gap = Math.abs(na - nb);
  const jeuxPerdant = Math.max(0, 5 - gap);
  return {
    teamAId,
    teamBId,
    vainqueurId: aGagne ? teamAId : teamBId,
    setsA: aGagne ? 1 : 0,
    setsB: aGagne ? 0 : 1,
    jeuxA: aGagne ? 7 : jeuxPerdant,
    jeuxB: aGagne ? jeuxPerdant : 7,
  };
}

export const TOURNOI_25_JUILLET: Scenario = {
  nom: "tournoi-25-juillet",
  equipes: Array.from({ length: 14 }, (_, i) => ({ id: `equipe${i + 1}` })),
  graineTirage: 20260725,
  heureDebut: "2026-07-25T07:00:00.000Z",
  terrains: [
    { id: "court1", ordre: 1 },
    { id: "court2", ordre: 2 },
    { id: "court3", ordre: 3 },
  ],
  dureeJeuMin: 25,
  rotationMin: 5,
  reposMinMin: 15,
  criteres: CRITERES_14,
  nbQualifies: 8,
  simulerMatch: simulerMatchParNumero,
};
