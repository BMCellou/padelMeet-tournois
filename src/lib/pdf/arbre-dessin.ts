// Dessin d'un tableau final (vierge ou rempli) à partir de la disposition de arbre.ts.

import type { LibelleMatchTableau } from "@/lib/engine/tableauLibelles";
import { disposerArbre, type Zone } from "./arbre";
import { COULEURS } from "./marque";
import { coteMatch, estJoue, etiquetteMatch, resumeScore, titreTour } from "./mise-en-page";
import type { Rendu } from "./outils";
import type { DonneesTournoi, MatchPdf } from "./types";

export interface LigneBoite {
  texte: string;
  gras?: boolean;
  gris?: number;
}

export interface ContenuBoite {
  titre?: string;
  lignes: [LigneBoite, LigneBoite];
  /** Score en clair, affiché sous les équipes quand la case est assez haute. */
  score?: string;
}

export interface BoiteLibre {
  x: number;
  haut: number;
  largeur: number;
  hauteur: number;
}

/** Contenu d'une case pour un match donné : équipes (ou leur provenance), vainqueur en gras, score. */
export function contenuBoiteMatch(d: DonneesTournoi, m: MatchPdf, libelles: Map<string, LibelleMatchTableau>): ContenuBoite {
  const joue = estJoue(m);
  const gagnantA = joue && m.winnerId !== null && m.winnerId === m.teamAId;
  const gagnantB = joue && m.winnerId !== null && m.winnerId === m.teamBId;
  return {
    titre: etiquetteMatch(d, m, libelles),
    lignes: [
      { texte: coteMatch(d, m, "a", libelles), gras: gagnantA, gris: m.teamAId ? 0 : 0.45 },
      { texte: coteMatch(d, m, "b", libelles), gras: gagnantB, gris: m.teamBId ? 0 : 0.45 },
    ],
    score: resumeScore(m),
  };
}

/** Une case de match : cadre, titre minuscule, deux lignes d'équipe séparées, score éventuel. */
export function dessinerBoite(rendu: Rendu, b: BoiteLibre, c: ContenuBoite): void {
  rendu.rectangle(b.x, b.haut, b.largeur, b.hauteur, 0.9, COULEURS.blanc);
  const avecTitre = !!c.titre && b.hauteur >= 40;
  const avecScore = !!c.score && b.hauteur >= 44;
  const zoneTitre = avecTitre ? 9 : 0;
  const zoneScore = avecScore ? 9 : 0;
  const hLigne = (b.hauteur - zoneTitre - zoneScore) / 2;
  const taille = Math.max(6, Math.min(8.5, hLigne - 4));

  if (avecTitre) rendu.texte(b.x + 3, b.haut - 7, c.titre!, { taille: 6, gris: 0.35 });

  c.lignes.forEach((ligne, i) => {
    const haut = b.haut - zoneTitre - i * hLigne;
    if (i === 1) rendu.trait(b.x, haut, b.x + b.largeur, haut, 0.5, COULEURS.trait);
    if (ligne.texte) {
      let t = ligne.texte;
      const max = b.largeur - 6;
      while (t.length > 1 && rendu.largeurTexte(t, taille, ligne.gras) > max) t = t.slice(0, -1);
      if (t !== ligne.texte) t = `${t.slice(0, -1)}…`;
      rendu.texte(b.x + 3, haut - hLigne / 2 - taille / 3, t, { taille, gras: ligne.gras, gris: ligne.gris });
    }
  });

  if (avecScore) rendu.texte(b.x + 3, b.haut - b.hauteur + 2.5, c.score!, { taille: 6.5, gris: 0.2 });
}

function etiquetteVierge(tour: number, nbTours: number, index: number): string {
  const restant = nbTours - 1 - tour;
  if (restant === 0) return "Finale";
  if (restant === 1) return `Demi n°${index + 1}`;
  if (restant === 2) return `Quart n°${index + 1}`;
  if (restant === 3) return `8e n°${index + 1}`;
  return `Tour ${tour + 1} n°${index + 1}`;
}

/**
 * Dessine l'arbre d'un tableau de `nbQualifies` équipes dans `zone`, avec le
 * nom des tours en tête de colonne. `contenu(tour, index)` remplit une case
 * (tour 0 = premier tour) ; sans contenu la case reste vierge.
 */
export function dessinerArbre(
  rendu: Rendu,
  nbQualifies: number,
  zone: Zone,
  contenu?: (tour: number, index: number) => ContenuBoite | undefined,
): void {
  const entete = 14;
  const d = disposerArbre(nbQualifies, { ...zone, haut: zone.haut - entete, hauteur: zone.hauteur - entete });

  d.boites.forEach((colonne, tour) => {
    rendu.texte(colonne[0].x + colonne[0].largeur / 2, zone.haut - 9, titreTour(tour, d.nbTours), {
      taille: 8.5,
      gras: true,
      align: "centre",
    });
    colonne.forEach((b) => {
      const vierge: ContenuBoite = {
        titre: etiquetteVierge(tour, d.nbTours, b.index),
        lignes: [{ texte: "" }, { texte: "" }],
      };
      dessinerBoite(rendu, b, contenu?.(tour, b.index) ?? vierge);
    });
  });

  for (const s of d.segments) rendu.trait(s.x1, s.y1, s.x2, s.y2, 0.8);
}
