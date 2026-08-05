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

export function determinerVainqueurSet(set: SetSaisi, format: MatchFormat): VainqueurSet {
  const { jeuxA, jeuxB } = set;

  if (jeuxA === jeuxB) {
    if (format.jeuDecisif?.actif && jeuxA === format.jeuDecisif.declencheA) {
      if (set.tiebreakA == null || set.tiebreakB == null) return null;
      if (set.tiebreakA === set.tiebreakB) return null;
      return set.tiebreakA > set.tiebreakB ? "a" : "b";
    }
    return null;
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
