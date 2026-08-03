// Fait "remonter" automatiquement le vainqueur d'un match de tableau vers
// le match suivant (nextMatchId / nextSlot).

import type { MatchTableau } from "./tableau";

export function propagerVainqueur(
  matches: MatchTableau[],
  matchId: string,
  vainqueurId: string,
): MatchTableau[] {
  const matchTermine = matches.find((m) => m.id === matchId);
  if (!matchTermine) {
    throw new Error(`Match introuvable : ${matchId}`);
  }

  return matches.map((m) => {
    if (m.id === matchId) {
      return { ...m, winnerId: vainqueurId };
    }
    if (matchTermine.nextMatchId && m.id === matchTermine.nextMatchId) {
      return {
        ...m,
        teamAId: matchTermine.nextSlot === "a" ? vainqueurId : m.teamAId,
        teamBId: matchTermine.nextSlot === "b" ? vainqueurId : m.teamBId,
      };
    }
    return m;
  });
}
