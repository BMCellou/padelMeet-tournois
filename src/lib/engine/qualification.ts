// §4.7 — Qualification pour le tableau final. Taille du tableau = plus
// grande puissance de 2 ≤ nombre d'équipes, plafonnée par nb_qualifies.
// Départage des "meilleurs Nes" entre poules de tailles différentes par
// ratios uniquement (jamais de différences absolues).

import type { EquipeClassee } from "./classement";

export interface ClassementPoule {
  groupId: string;
  equipes: EquipeClassee[];
}

export interface QualificationResult {
  qualifies: string[];
  tailleTableau: number;
  avertissement?: string;
}

function plusGrandePuissanceDe2(n: number): number {
  if (n < 1) return 0;
  return 2 ** Math.floor(Math.log2(n));
}

function ratioVictoires(e: EquipeClassee): number {
  return e.joues > 0 ? e.v / e.joues : 0;
}

function trierParRatios(equipes: EquipeClassee[]): EquipeClassee[] {
  return [...equipes].sort((a, b) => {
    if (ratioVictoires(b) !== ratioVictoires(a)) return ratioVictoires(b) - ratioVictoires(a);
    if (b.ratioSets !== a.ratioSets) return b.ratioSets - a.ratioSets;
    return b.ratioJeux - a.ratioJeux;
  });
}

export function selectionnerQualifies(
  classementsParPoule: ClassementPoule[],
  nbQualifies: number,
): QualificationResult {
  const totalEquipes = classementsParPoule.reduce((s, p) => s + p.equipes.length, 0);
  const tailleTableau = Math.min(nbQualifies, plusGrandePuissanceDe2(totalEquipes));

  const qualifies: string[] = [];
  let rangPoule = 1;
  let avertissement: string | undefined;

  while (qualifies.length < tailleTableau) {
    const candidats = classementsParPoule
      .map((p) => p.equipes.find((e) => e.rang === rangPoule))
      .filter((e): e is EquipeClassee => e !== undefined);

    if (candidats.length === 0) break;

    const placesRestantes = tailleTableau - qualifies.length;
    const tries = trierParRatios(candidats);

    if (candidats.length <= placesRestantes) {
      qualifies.push(...tries.map((e) => e.teamId));
    } else {
      qualifies.push(...tries.slice(0, placesRestantes).map((e) => e.teamId));
    }

    rangPoule++;
  }

  if (qualifies.length < tailleTableau) {
    avertissement = `Seulement ${qualifies.length} équipe(s) qualifiable(s) pour un tableau de ${tailleTableau}.`;
  }

  return { qualifies, tailleTableau, avertissement };
}
