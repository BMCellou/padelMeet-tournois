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

// ── Phase finale ─────────────────────────────────────────────────────────
// Un match de tableau se planifie même si ses équipes sont inconnues : on
// réserve un terrain et un créneau pour « le quart de finale n°3 ». Le
// placement est contraint par la structure du tableau, pas par les
// équipes : tous les matchs d'un tour avant tous ceux du tour suivant,
// avec le repos minimum entre deux tours. Les équipes déjà connues (quarts,
// match pour la 5e place) respectent en plus le repos depuis leur dernier
// match de poule. Le match pour la 3e place (équipes connues seulement
// après les demi-finales) partage le tour de la finale ; celui pour la
// 5e place partage le tour des demi-finales.

export interface MatchTableauAPlanifier {
  id: string;
  phase: "tableau" | "classement" | "classement_5e";
  round: number;
  bracketSlot: number | null;
  teamAId: string | null;
  teamBId: string | null;
}

/** Match déjà placé (typiquement un match de poule) qui occupe un terrain
 * et fait jouer des équipes avant la phase finale. */
export interface OccupationExistante {
  courtId: string;
  debut: string;
  fin: string;
  teamAId: string | null;
  teamBId: string | null;
}

const ORDRE_DANS_LE_TOUR: Record<MatchTableauAPlanifier["phase"], number> = {
  tableau: 0,
  classement_5e: 1,
  classement: 2,
};

export function planifierTableau(
  matchs: MatchTableauAPlanifier[],
  courts: Court[],
  options: PlanificationOptions,
  existants: OccupationExistante[] = [],
): MatchPlanifie[] {
  if (courts.length === 0) {
    throw new Error("Au moins un terrain est nécessaire pour planifier.");
  }

  const courtsTries = [...courts].sort((a, b) => a.ordre - b.ordre);
  const creneauMs = (options.dureeJeuMin + options.rotationMin) * 60_000;
  const dureeJeuMs = options.dureeJeuMin * 60_000;
  const reposMs = options.reposMinMin * 60_000;
  const rotationMs = options.rotationMin * 60_000;

  const finsExistantes = existants.map((e) => new Date(e.fin).getTime());
  const debutMs =
    finsExistantes.length > 0
      ? Math.max(...finsExistantes) + rotationMs
      : new Date(options.heureDebut).getTime();

  const occupation = new Map<string, [number, number][]>();
  const finParEquipe = new Map<string, number>();
  const occuper = (courtId: string, debut: number, fin: number) => {
    occupation.set(courtId, [...(occupation.get(courtId) ?? []), [debut, fin]]);
  };
  for (const e of existants) {
    const fin = new Date(e.fin).getTime();
    occuper(e.courtId, new Date(e.debut).getTime(), fin);
    for (const t of [e.teamAId, e.teamBId]) {
      if (t) finParEquipe.set(t, Math.max(finParEquipe.get(t) ?? 0, fin));
    }
  }

  const courtLibre = (courtId: string, debut: number, fin: number) =>
    !(occupation.get(courtId) ?? []).some(([d, f]) => debut < f && d < fin);
  const equipeLibre = (teamId: string | null, debut: number) => {
    if (!teamId) return true;
    const fin = finParEquipe.get(teamId);
    return fin === undefined || debut - fin >= reposMs;
  };

  const tours = [...new Set(matchs.map((m) => m.round))].sort((a, b) => a - b);
  const resultat: MatchPlanifie[] = [];
  let borneTour = debutMs;

  for (const tour of tours) {
    const matchsDuTour = matchs
      .filter((m) => m.round === tour)
      .sort(
        (a, b) =>
          ORDRE_DANS_LE_TOUR[a.phase] - ORDRE_DANS_LE_TOUR[b.phase] ||
          (a.bracketSlot ?? 0) - (b.bracketSlot ?? 0),
      );
    const premierCreneau = Math.max(0, Math.ceil((borneTour - debutMs) / creneauMs));
    let finDuTour = borneTour;

    for (const m of matchsDuTour) {
      for (let k = premierCreneau; ; k++) {
        const debut = debutMs + k * creneauMs;
        const fin = debut + dureeJeuMs;
        if (!equipeLibre(m.teamAId, debut) || !equipeLibre(m.teamBId, debut)) continue;
        const court = courtsTries.find((c) => courtLibre(c.id, debut, fin));
        if (!court) continue;

        occuper(court.id, debut, fin);
        for (const t of [m.teamAId, m.teamBId]) if (t) finParEquipe.set(t, fin);
        finDuTour = Math.max(finDuTour, fin);
        resultat.push({
          matchId: m.id,
          courtId: court.id,
          debut: new Date(debut).toISOString(),
          fin: new Date(fin).toISOString(),
        });
        break;
      }
    }
    borneTour = finDuTour + reposMs;
  }

  return resultat;
}
