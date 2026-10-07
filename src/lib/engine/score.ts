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
}

export function determinerVainqueurMatch(sets: SetSaisi[], format: MatchFormat): ResultatMatch {
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
  if (determinerVainqueurMatch(sets, format).vainqueur) return null;

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
