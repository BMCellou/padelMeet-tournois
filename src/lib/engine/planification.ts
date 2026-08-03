// §4.4 étape 2 — Placement des matchs sur les terrains. Algorithme glouton
// sous contraintes : aucun joueur (équipe) sur deux terrains à la fois,
// repos minimum configurable, alternance des poules, remplissage des
// terrains avant ouverture d'un nouveau créneau. Pas d'optimalité visée :
// l'ajustement manuel (admin, hors moteur) couvre le reste.

export interface Court {
  id: string;
  ordre: number;
}

export interface MatchAPlanifier {
  id: string;
  groupId: string | null;
  round: number;
  teamAId: string;
  teamBId: string;
}

export interface PlanificationOptions {
  heureDebut: string; // ISO
  dureeJeuMin: number; // défaut 25
  rotationMin: number; // défaut 5
  reposMinMin: number; // défaut 15
}

export interface MatchPlanifie {
  matchId: string;
  courtId: string;
  debut: string;
  fin: string;
}

function ordonnerPourAlternance(matches: MatchAPlanifier[]): MatchAPlanifier[] {
  return [...matches].sort((a, b) => {
    if (a.round !== b.round) return a.round - b.round;
    return (a.groupId ?? "").localeCompare(b.groupId ?? "");
  });
}

export function planifier(
  matches: MatchAPlanifier[],
  courts: Court[],
  options: PlanificationOptions,
): MatchPlanifie[] {
  if (courts.length === 0) {
    throw new Error("Au moins un terrain est nécessaire pour planifier.");
  }

  const courtsTries = [...courts].sort((a, b) => a.ordre - b.ordre);
  const dureeCreneauMs = (options.dureeJeuMin + options.rotationMin) * 60_000;
  const dureeJeuMs = options.dureeJeuMin * 60_000;
  const reposMinMs = options.reposMinMin * 60_000;
  const heureDebutMs = new Date(options.heureDebut).getTime();

  const matchesOrdonnes = ordonnerPourAlternance(matches);

  const occupationCourts = new Set<string>(); // `${courtId}:${slotIndex}`
  const finDeJeuParEquipe = new Map<string, number>(); // teamId -> timestamp ms

  const resultat: MatchPlanifie[] = [];
  let slotIndex = 0;

  for (const m of matchesOrdonnes) {
    for (;;) {
      const debutCandidat = heureDebutMs + slotIndex * dureeCreneauMs;

      const equipeLibre = (teamId: string) => {
        const finPrecedente = finDeJeuParEquipe.get(teamId);
        return finPrecedente === undefined || debutCandidat - finPrecedente >= reposMinMs;
      };

      if (equipeLibre(m.teamAId) && equipeLibre(m.teamBId)) {
        const court = courtsTries.find(
          (c) => !occupationCourts.has(`${c.id}:${slotIndex}`),
        );
        if (court) {
          occupationCourts.add(`${court.id}:${slotIndex}`);
          const fin = debutCandidat + dureeJeuMs;
          finDeJeuParEquipe.set(m.teamAId, fin);
          finDeJeuParEquipe.set(m.teamBId, fin);
          resultat.push({
            matchId: m.id,
            courtId: court.id,
            debut: new Date(debutCandidat).toISOString(),
            fin: new Date(fin).toISOString(),
          });
          break;
        }
      }

      slotIndex++;
    }
  }

  return resultat;
}
