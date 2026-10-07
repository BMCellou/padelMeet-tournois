// Disposition d'un tableau à élimination directe sur une page : positions
// des cases par tour et segments de liaison. Pur (aucun dessin ici).

export interface Zone {
  x: number;
  /** Bord haut de la zone (les ordonnées vont vers le haut, comme en PDF). */
  haut: number;
  largeur: number;
  hauteur: number;
}

export interface BoiteArbre {
  tour: number;
  index: number;
  x: number;
  haut: number;
  largeur: number;
  hauteur: number;
}

export interface Segment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface DispositionArbre {
  nbTours: number;
  boites: BoiteArbre[][];
  segments: Segment[];
}

/** Nombre de tours d'un tableau de `nbQualifies` équipes (puissance de 2 ≥ 2). */
export function nombreDeTours(nbQualifies: number): number {
  return Math.round(Math.log2(nbQualifies));
}

export function disposerArbre(
  nbQualifies: number,
  zone: Zone,
  hauteurBoiteMax = 52,
  ecartTours = 22,
): DispositionArbre {
  if (nbQualifies < 2 || (nbQualifies & (nbQualifies - 1)) !== 0) {
    throw new Error(`Un tableau a un nombre d'équipes qui est une puissance de 2 (reçu ${nbQualifies}).`);
  }
  const nbTours = nombreDeTours(nbQualifies);
  const nbPremierTour = nbQualifies / 2;
  const largeurBoite = (zone.largeur - (nbTours - 1) * ecartTours) / nbTours;
  const creneau = zone.hauteur / nbPremierTour;
  const hauteurBoite = Math.max(16, Math.min(hauteurBoiteMax, creneau - 4));

  const boites: BoiteArbre[][] = [];
  const centres: number[][] = [];

  for (let tour = 0; tour < nbTours; tour++) {
    const nb = nbPremierTour / 2 ** tour;
    const x = zone.x + tour * (largeurBoite + ecartTours);
    const colonne: BoiteArbre[] = [];
    const centresTour: number[] = [];
    for (let i = 0; i < nb; i++) {
      const centre =
        tour === 0
          ? zone.haut - creneau * (i + 0.5)
          : (centres[tour - 1][2 * i] + centres[tour - 1][2 * i + 1]) / 2;
      centresTour.push(centre);
      colonne.push({ tour, index: i, x, haut: centre + hauteurBoite / 2, largeur: largeurBoite, hauteur: hauteurBoite });
    }
    boites.push(colonne);
    centres.push(centresTour);
  }

  const segments: Segment[] = [];
  for (let tour = 1; tour < nbTours; tour++) {
    for (const cible of boites[tour]) {
      const milieuX = cible.x - ecartTours / 2;
      const centreCible = cible.haut - cible.hauteur / 2;
      const sources = [boites[tour - 1][2 * cible.index], boites[tour - 1][2 * cible.index + 1]];
      for (const s of sources) {
        const centreSource = s.haut - s.hauteur / 2;
        segments.push({ x1: s.x + s.largeur, y1: centreSource, x2: milieuX, y2: centreSource });
        segments.push({ x1: milieuX, y1: centreSource, x2: milieuX, y2: centreCible });
      }
      segments.push({ x1: milieuX, y1: centreCible, x2: cible.x, y2: centreCible });
    }
  }

  return { nbTours, boites, segments };
}
