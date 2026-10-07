// §4.5 — Détermination du vainqueur d'un set puis d'un match à partir du
// score saisi et du `match_format`. Un score où aucun camp n'atteint le
// seuil (ex. 5-4 au buzzer, règle "leader_gagne") reste valide : seule
// l'égalité stricte des jeux sans tie-break résolu laisse le set
// indéterminé.

import type { MatchFormat } from "./types";

export interface SetSaisi {
  jeuxA: number;
  jeuxB: number;
  tiebreakA?: number | null;
  tiebreakB?: number | null;
}

export type VainqueurSet = "a" | "b" | null;

/**
 * Un set à égalité de jeux se départage dans deux cas : le jeu décisif
 * habituel (égalité au seuil de déclenchement, ex. 6-6) et l'égalité au
 * buzzer (limite de temps écoulée, quel que soit le score, ex. 4-4). Sans
 * limite de temps, une égalité hors tie-break n'est pas une fin de set :
 * le jeu continue.
 */
function departageAutorise(set: SetSaisi, format: MatchFormat): boolean {
  if (format.jeuDecisif?.actif && set.jeuxA === format.jeuDecisif.declencheA) return true;
  return format.limiteTempsMin != null;
}

/** Vrai pour un set à égalité qui se joue sur le départage « au buzzer » (pas le tie-break classique). */
export function estEgaliteAuBuzzer(set: SetSaisi, format: MatchFormat): boolean {
  if (set.jeuxA !== set.jeuxB || set.jeuxA === 0 && !set.tiebreakA && !set.tiebreakB) return false;
  if (format.limiteTempsMin == null) return false;
  return !(format.jeuDecisif?.actif && set.jeuxA === format.jeuDecisif.declencheA);
}

export function determinerVainqueurSet(set: SetSaisi, format: MatchFormat): VainqueurSet {
  const { jeuxA, jeuxB } = set;

  if (jeuxA === jeuxB) {
    if (!departageAutorise(set, format)) return null;
    if (set.tiebreakA == null || set.tiebreakB == null) return null;
    if (set.tiebreakA === set.tiebreakB) return null;
    return set.tiebreakA > set.tiebreakB ? "a" : "b";
  }

  return jeuxA > jeuxB ? "a" : "b";
}

export interface ResultatMatch {
  vainqueur: "a" | "b" | null;
  setsGagnesA: number;
  setsGagnesB: number;
  /** Mode points sans somme exacte : égalité acceptée comme match nul (aucun vainqueur, match valide). */
  nul?: boolean;
}

export function estModePoints(format: MatchFormat): boolean {
  return format.modeScore === "points";
}

/** Départage par point en or : un score (1-0) saisi dans les champs de tie-break d'un set à égalité. */
function vainqueurDuDepartage(set: SetSaisi): "a" | "b" | null {
  if (set.tiebreakA == null || set.tiebreakB == null || set.tiebreakA === set.tiebreakB) return null;
  return set.tiebreakA > set.tiebreakB ? "a" : "b";
}

/**
 * Mode points : une manche, le vainqueur est le camp au score le plus élevé.
 * Une égalité suit `sommeExacte` :
 *  - total exact : égalité refusée, sauf point en or saisi qui la départage ;
 *  - total libre (manche limitée par le temps) : l'égalité est un match nul valide.
 */
function determinerVainqueurPoints(sets: SetSaisi[], format: MatchFormat): ResultatMatch {
  const manche = sets[0];
  if (!manche) return { vainqueur: null, setsGagnesA: 0, setsGagnesB: 0 };
  const { jeuxA, jeuxB } = manche;
  if (jeuxA !== jeuxB) {
    const a = jeuxA > jeuxB;
    return { vainqueur: a ? "a" : "b", setsGagnesA: a ? 1 : 0, setsGagnesB: a ? 0 : 1 };
  }
  const departage = vainqueurDuDepartage(manche);
  if (departage) {
    return { vainqueur: departage, setsGagnesA: departage === "a" ? 1 : 0, setsGagnesB: departage === "b" ? 1 : 0 };
  }
  if (format.sommeExacte === false) return { vainqueur: null, setsGagnesA: 0, setsGagnesB: 0, nul: true };
  return { vainqueur: null, setsGagnesA: 0, setsGagnesB: 0 };
}

export function determinerVainqueurMatch(sets: SetSaisi[], format: MatchFormat): ResultatMatch {
  if (estModePoints(format)) return determinerVainqueurPoints(sets, format);

  let setsGagnesA = 0;
  let setsGagnesB = 0;

  for (const set of sets) {
    const v = determinerVainqueurSet(set, format);
    if (v === "a") setsGagnesA++;
    else if (v === "b") setsGagnesB++;
  }

  let vainqueur: "a" | "b" | null = null;
  if (setsGagnesA >= format.nbSetsGagnants) vainqueur = "a";
  else if (setsGagnesB >= format.nbSetsGagnants) vainqueur = "b";

  return { vainqueur, setsGagnesA, setsGagnesB };
}

/**
 * Pourquoi un score ne désigne pas (encore) de vainqueur, avec la marche à
 * suivre — pour que le scoreur ne reste jamais devant un match qu'il ne
 * comprend pas pourquoi il ne peut pas valider. Null si le vainqueur est clair.
 */
export function expliquerScoreIndetermine(sets: SetSaisi[], format: MatchFormat): string | null {
  const resultat = determinerVainqueurMatch(sets, format);
  if (resultat.vainqueur || resultat.nul) return null;

  if (estModePoints(format)) {
    const manche = sets[0];
    if (!manche) return "Saisis le score de la manche.";
    if (manche.jeuxA === manche.jeuxB) {
      return `Égalité ${manche.jeuxA}-${manche.jeuxB} : avec un total exact de ${format.pointsCible} points, une égalité est refusée. Jouez un point en or et saisissez son gagnant.`;
    }
  }

  const regle = format.egaliteAuBuzzer ?? "point_en_or";
  for (const set of sets) {
    if (determinerVainqueurSet(set, format) !== null || set.jeuxA !== set.jeuxB) continue;
    if (set.jeuxA === 0 && !set.tiebreakA && !set.tiebreakB) continue;
    const score = `${set.jeuxA}-${set.jeuxB}`;

    if (format.jeuDecisif?.actif && set.jeuxA === format.jeuDecisif.declencheA) {
      return `Égalité ${score} : saisis le score du tie-break pour désigner le vainqueur du set.`;
    }
    if (format.limiteTempsMin == null) {
      return `Égalité ${score} : le set n'est pas terminé (aucune limite de temps n'est définie). Continuez à jouer, ou déclarez un forfait.`;
    }
    if (regle === "jeu_decisif") return `Égalité ${score} au buzzer : saisis le score du jeu décisif (les deux scores doivent différer).`;
    if (regle === "nul_interdit") return `Égalité ${score} au buzzer : un nul est impossible, désigne l'équipe vainqueur.`;
    return `Égalité ${score} au buzzer : saisis le gagnant du point en or.`;
  }
  return "Le score ne désigne pas encore de vainqueur : il manque un set ou un score.";
}

/** Affichage d'un set : « 7-5 », « 6-6 (7-4) » (tie-break), « 4-4 (1-0) » (départage au buzzer). */
export function libelleSet(s: SetSaisi): string {
  if (s.tiebreakA == null || s.tiebreakB == null) return `${s.jeuxA}-${s.jeuxB}`;
  if (s.jeuxA === s.jeuxB) return `${s.jeuxA}-${s.jeuxB} (${s.tiebreakA}-${s.tiebreakB})`;
  return `${s.jeuxA}-${s.jeuxB}(${Math.min(s.tiebreakA, s.tiebreakB)})`;
}

/**
 * Mode points avec total exact : la saisie d'un camp déduit l'autre. Null quand le
 * format n'est pas concerné ou que le score saisi est impossible (hors 0..total).
 */
export function deduireAutreCamp(pointsUnCamp: number, format: MatchFormat): number | null {
  if (!estModePoints(format) || format.sommeExacte === false) return null;
  if (!Number.isInteger(pointsUnCamp) || pointsUnCamp < 0 || pointsUnCamp > format.pointsCible) return null;
  return format.pointsCible - pointsUnCamp;
}

/** Une égalité est-elle possible (donc à départager par un point en or) pour ce total exact ? */
export function egalitePossibleEnPoints(format: MatchFormat): boolean {
  return estModePoints(format) && format.sommeExacte !== false && format.pointsCible % 2 === 0;
}

/**
 * Cohérence d'une saisie en points : entiers positifs et, en total exact, somme égale
 * à `pointsCible`. Message d'erreur, ou null si la saisie est acceptable.
 */
export function verifierSaisiePoints(sets: SetSaisi[], format: MatchFormat): string | null {
  if (!estModePoints(format)) return null;
  const manche = sets[0];
  if (!manche) return "Saisis le score de la manche.";
  const { jeuxA, jeuxB } = manche;
  if (![jeuxA, jeuxB].every((p) => Number.isInteger(p) && p >= 0)) return "Les points doivent être des entiers positifs.";
  if (format.sommeExacte !== false && jeuxA + jeuxB !== format.pointsCible) {
    return `Le total doit valoir exactement ${format.pointsCible} points (reçu ${jeuxA + jeuxB}).`;
  }
  return null;
}
