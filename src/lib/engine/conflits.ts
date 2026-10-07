// §4.4 étape 3 — Détection de conflits en direct après un ajustement
// manuel du calendrier : un même terrain occupé deux fois, une équipe
// convoquée deux fois en même temps, un repos insuffisant entre deux
// matchs d'une même équipe, ou — en phase finale — un match placé avant
// (ou trop près d') un match qui l'alimente. Les équipes d'un match de
// tableau peuvent être inconnues (null) : elles ne créent alors aucun
// conflit d'équipe, seule la structure du tableau contraint.

export interface MatchPlanifieAvecEquipes {
  matchId: string;
  courtId: string;
  teamAId: string | null;
  teamBId: string | null;
  debut: string; // ISO
  fin: string; // ISO
  /** Matchs de tableau dont le résultat alimente celui-ci (vainqueurs, ou
   * perdants pour le match de 3e place). */
  alimentePar?: string[];
}

export type TypeConflit =
  | "meme_terrain"
  | "equipe_double_reservee"
  | "repos_insuffisant"
  | "avant_match_alimentant";

export interface Conflit {
  type: TypeConflit;
  matchIds: [string, string];
}

function seChevauchent(aDebut: number, aFin: number, bDebut: number, bFin: number): boolean {
  return aDebut < bFin && bDebut < aFin;
}

function equipesCommunes(a: MatchPlanifieAvecEquipes, b: MatchPlanifieAvecEquipes): boolean {
  const equipesA = [a.teamAId, a.teamBId].filter((t): t is string => !!t);
  return equipesA.some((t) => t === b.teamAId || t === b.teamBId);
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

  const parId = new Map(matches.map((m) => [m.matchId, m]));
  for (const m of matches) {
    const debut = new Date(m.debut).getTime();
    for (const idAlimentant of m.alimentePar ?? []) {
      const alimentant = parId.get(idAlimentant);
      if (!alimentant) continue;
      const finAlimentant = new Date(alimentant.fin).getTime();
      // Avant la fin du match qui l'alimente : impossible. Après, mais
      // sans le repos minimum : les joueurs pas encore connus enchaînent.
      if (debut < finAlimentant) {
        conflits.push({ type: "avant_match_alimentant", matchIds: [m.matchId, idAlimentant] });
      } else if (debut - finAlimentant < reposMinMs) {
        conflits.push({ type: "repos_insuffisant", matchIds: [m.matchId, idAlimentant] });
      }
    }
  }

  return conflits;
}
