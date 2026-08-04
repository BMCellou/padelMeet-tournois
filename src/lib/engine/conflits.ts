// §4.4 étape 3 — Détection de conflits en direct après un ajustement
// manuel du calendrier : un même terrain occupé deux fois, une équipe
// convoquée deux fois en même temps, ou un repos insuffisant entre deux
// matchs d'une même équipe.

export interface MatchPlanifieAvecEquipes {
  matchId: string;
  courtId: string;
  teamAId: string;
  teamBId: string;
  debut: string; // ISO
  fin: string; // ISO
}

export type TypeConflit = "meme_terrain" | "equipe_double_reservee" | "repos_insuffisant";

export interface Conflit {
  type: TypeConflit;
  matchIds: [string, string];
}

function seChevauchent(aDebut: number, aFin: number, bDebut: number, bFin: number): boolean {
  return aDebut < bFin && bDebut < aFin;
}

function equipesCommunes(a: MatchPlanifieAvecEquipes, b: MatchPlanifieAvecEquipes): boolean {
  return (
    a.teamAId === b.teamAId ||
    a.teamAId === b.teamBId ||
    a.teamBId === b.teamAId ||
    a.teamBId === b.teamBId
  );
}

export function detecterConflits(
  matches: MatchPlanifieAvecEquipes[],
  reposMinMin: number,
): Conflit[] {
  const conflits: Conflit[] = [];
  const reposMinMs = reposMinMin * 60_000;

  for (let i = 0; i < matches.length; i++) {
    for (let j = i + 1; j < matches.length; j++) {
      const a = matches[i];
      const b = matches[j];
      const aDebut = new Date(a.debut).getTime();
      const aFin = new Date(a.fin).getTime();
      const bDebut = new Date(b.debut).getTime();
      const bFin = new Date(b.fin).getTime();
      const chevauchement = seChevauchent(aDebut, aFin, bDebut, bFin);

      if (chevauchement && a.courtId === b.courtId) {
        conflits.push({ type: "meme_terrain", matchIds: [a.matchId, b.matchId] });
      }

      if (equipesCommunes(a, b)) {
        if (chevauchement) {
          conflits.push({ type: "equipe_double_reservee", matchIds: [a.matchId, b.matchId] });
        } else {
          const gap = aDebut >= bFin ? aDebut - bFin : bDebut - aFin;
          if (gap < reposMinMs) {
            conflits.push({ type: "repos_insuffisant", matchIds: [a.matchId, b.matchId] });
          }
        }
      }
    }
  }

  return conflits;
}
