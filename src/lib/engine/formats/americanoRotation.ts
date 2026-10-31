// Rotation Americano : à chaque tour on change de partenaire et d'adversaires.
// Appariement glouton minimisant d'abord les partenariats répétés (poids fort),
// ensuite les adversaires répétés (poids faible), avec répartition équitable des
// exemptions quand l'effectif n'est pas un multiple de 4 (ou que les terrains
// manquent). Reproductible : la graine fixe tout (docs/formats-animation.md §4.5).
//
// Deux voies, même résultat attendu :
//  - effectif de 4k joueurs jouant tous à chaque tour : les partenariats viennent de
//    la méthode du cercle (construction combinatoire), sans aucune répétition tant que
//    le nombre de tours ne dépasse pas n - 1 ; l'algorithme glouton ne règle alors que
//    les adversaires. 8 joueurs sur 7 tours : l'Americano parfait ;
//  - sinon (exemptions) : choix des exemptés par équité, puis tirage glouton + amélioration
//    locale des quatre joueurs de chaque manche.
//
// Pur : aucun accès base, aucune horloge ; la graine est un paramètre.

import type { Court } from "../planification";
import { creerRng, melanger } from "../rng";

/** Au-delà, le calcul glouton peut laisser des partenariats répétés : avertissement, pas blocage. */
export const SEUIL_AVERTISSEMENT_JOUEURS = 40;

const POIDS_PARTENAIRE = 1000;
const POIDS_ADVERSAIRE = 1;

export interface MancheRotation {
  /** Indice du terrain dans la liste fournie (0 = premier). */
  terrainIndex: number;
  paireA: [string, string];
  paireB: [string, string];
}

export interface TourRotation {
  numero: number;
  manches: MancheRotation[];
  exempts: string[];
}

export interface StatistiquesRotation {
  partenariatsDistincts: number;
  /** Somme, sur chaque binôme, des fois où il se reforme après la première. */
  partenariatsRepetes: number;
  adversairesRepetes: number;
  exemptionsParJoueur: Record<string, number>;
  /** Écart entre le joueur le plus et le moins exempté. */
  ecartExemptions: number;
}

export interface Rotation {
  /** Graine mémorisée : la même graine redonne exactement la même rotation. */
  graine: number;
  tours: TourRotation[];
  statistiques: StatistiquesRotation;
  avertissements: string[];
}

type Compteurs = Map<string, number>;

const cle = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
const lire = (m: Compteurs, a: string, b: string) => m.get(cle(a, b)) ?? 0;
const ajouter = (m: Compteurs, a: string, b: string) => m.set(cle(a, b), lire(m, a, b) + 1);

/** Nombre de manches par tour : un terrain par manche, pas plus de joueurs que d'inscrits. */
export function mancheParTour(nbJoueurs: number, nbTerrains: number): number {
  return Math.min(nbTerrains, Math.floor(nbJoueurs / 4));
}

/** Joueurs au repos à chaque tour pour cet effectif et ce nombre de terrains. */
export function exemptesParTour(nbJoueurs: number, nbTerrains: number): number {
  return nbJoueurs - 4 * mancheParTour(nbJoueurs, nbTerrains);
}

// ── Coût d'une disposition ──────────────────────────────────────────────

/** `slots` : 4 joueurs par manche, [paire A (2), paire B (2)]. */
function coutManche(s: string[], i: number, partenaires: Compteurs, adversaires: Compteurs): number {
  const [a, b, c, d] = [s[4 * i], s[4 * i + 1], s[4 * i + 2], s[4 * i + 3]];
  return (
    POIDS_PARTENAIRE * (lire(partenaires, a, b) + lire(partenaires, c, d)) +
    POIDS_ADVERSAIRE *
      (lire(adversaires, a, c) + lire(adversaires, a, d) + lire(adversaires, b, c) + lire(adversaires, b, d))
  );
}

function coutTotal(s: string[], partenaires: Compteurs, adversaires: Compteurs): number {
  let total = 0;
  for (let i = 0; i < s.length / 4; i++) total += coutManche(s, i, partenaires, adversaires);
  return total;
}

/** Tirage glouton puis amélioration locale (échanges de joueurs) ; le meilleur de plusieurs essais. */
function disposerJoueurs(
  joueurs: string[],
  partenaires: Compteurs,
  adversaires: Compteurs,
  rng: () => number,
): string[] {
  const essais = Math.max(6, Math.min(40, Math.floor(1200 / joueurs.length)));
  let meilleur: string[] = [];
  let meilleurCout = Infinity;

  for (let essai = 0; essai < essais && meilleurCout > 0; essai++) {
    const slots = melanger(joueurs, rng);
    let cout = coutTotal(slots, partenaires, adversaires);
    const tentatives = 30 * slots.length;
    for (let k = 0; k < tentatives && cout > 0; k++) {
      const i = Math.floor(rng() * slots.length);
      const j = Math.floor(rng() * slots.length);
      if (Math.floor(i / 4) === Math.floor(j / 4) && ((i % 4 < 2) === (j % 4 < 2))) continue; // même paire : sans effet
      [slots[i], slots[j]] = [slots[j], slots[i]];
      const nouveau = coutTotal(slots, partenaires, adversaires);
      if (nouveau <= cout) cout = nouveau;
      else [slots[i], slots[j]] = [slots[j], slots[i]];
    }
    if (cout < meilleurCout) {
      meilleurCout = cout;
      meilleur = [...slots];
    }
  }
  return meilleur;
}

// ── Méthode du cercle : binômes parfaits pour 4k joueurs ─────────────────

/** Tour `r` (0 ≤ r < n-1) de la méthode du cercle sur une liste de n joueurs (n pair). */
function binomesDuCercle(ordre: string[], r: number): [string, string][] {
  const n = ordre.length;
  const fixe = ordre[0];
  const mobiles = ordre.slice(1);
  const rot = mobiles.map((_, i) => mobiles[(i - r + (n - 1) * 8) % (n - 1)]);
  const paires: [string, string][] = [[fixe, rot[0]]];
  for (let i = 1; i < n / 2; i++) paires.push([rot[i], rot[n - 1 - i]]);
  return paires;
}

/** Réunit des binômes deux à deux en manches en minimisant les adversaires déjà rencontrés. */
function grouperBinomes(binomes: [string, string][], adversaires: Compteurs, rng: () => number): string[] {
  const restants = melanger(binomes, rng);
  const slots: string[] = [];
  while (restants.length > 0) {
    const premier = restants.shift()!;
    let meilleurIndex = 0;
    let meilleurCout = Infinity;
    restants.forEach((b, idx) => {
      const cout =
        lire(adversaires, premier[0], b[0]) + lire(adversaires, premier[0], b[1]) +
        lire(adversaires, premier[1], b[0]) + lire(adversaires, premier[1], b[1]);
      if (cout < meilleurCout) {
        meilleurCout = cout;
        meilleurIndex = idx;
      }
    });
    const [choisi] = restants.splice(meilleurIndex, 1);
    slots.push(premier[0], premier[1], choisi[0], choisi[1]);
  }
  return slots;
}

// ── Rotation ────────────────────────────────────────────────────────────

export function genererRotation(
  joueurs: string[],
  tours: number,
  terrains: number | Court[],
  graine: number,
): Rotation {
  const nbTerrains = typeof terrains === "number" ? terrains : terrains.length;
  if (new Set(joueurs).size !== joueurs.length) throw new Error("Un joueur ne peut figurer qu'une fois dans la rotation.");
  if (joueurs.length < 4) throw new Error("Au moins 4 joueurs sont nécessaires pour une rotation Americano.");
  if (!Number.isInteger(tours) || tours < 1) throw new Error("Le nombre de tours doit être un entier positif.");
  if (nbTerrains < 1) throw new Error("Au moins un terrain est nécessaire pour une rotation Americano.");

  const n = joueurs.length;
  const nbManches = mancheParTour(n, nbTerrains);
  const nbExemptes = exemptesParTour(n, nbTerrains);
  const rng = creerRng(graine);

  const partenaires: Compteurs = new Map();
  const adversaires: Compteurs = new Map();
  const exemptions = new Map<string, number>(joueurs.map((j) => [j, 0]));
  const dernierExempt = new Map<string, number>(joueurs.map((j) => [j, -1]));
  const resultat: TourRotation[] = [];

  let cercle = melanger(joueurs, rng);

  for (let t = 0; t < tours; t++) {
    let jouants = joueurs;
    let exempts: string[] = [];

    if (nbExemptes > 0) {
      // Équité : on repose ceux qui l'ont été le moins, puis depuis le plus longtemps.
      const classes = melanger(joueurs, rng).sort(
        (a, b) => exemptions.get(a)! - exemptions.get(b)! || dernierExempt.get(a)! - dernierExempt.get(b)!,
      );
      exempts = classes.slice(0, nbExemptes);
      const reposes = new Set(exempts);
      jouants = joueurs.filter((j) => !reposes.has(j));
    }

    let slots: string[];
    if (nbExemptes === 0 && n % 2 === 0) {
      // Binômes parfaits (méthode du cercle) ; au-delà de n - 1 tours on repart d'un nouveau mélange.
      const r = t % (n - 1);
      if (t > 0 && r === 0) cercle = melanger(joueurs, rng);
      slots = grouperBinomes(binomesDuCercle(cercle, r), adversaires, rng);
    } else {
      slots = disposerJoueurs(jouants, partenaires, adversaires, rng);
    }

    const manches: MancheRotation[] = [];
    for (let i = 0; i < nbManches; i++) {
      const [a, b, c, d] = [slots[4 * i], slots[4 * i + 1], slots[4 * i + 2], slots[4 * i + 3]];
      manches.push({ terrainIndex: (i + t) % nbTerrains, paireA: [a, b], paireB: [c, d] });
      ajouter(partenaires, a, b);
      ajouter(partenaires, c, d);
      for (const x of [a, b]) for (const y of [c, d]) ajouter(adversaires, x, y);
    }
    for (const j of exempts) {
      exemptions.set(j, exemptions.get(j)! + 1);
      dernierExempt.set(j, t);
    }
    resultat.push({ numero: t + 1, manches, exempts });
  }

  const repetes = (m: Compteurs) => [...m.values()].reduce((s, c) => s + Math.max(0, c - 1), 0);
  const nbExemptions = [...exemptions.values()];
  const avertissements: string[] = [];
  if (n > SEUIL_AVERTISSEMENT_JOUEURS) {
    avertissements.push(
      `${n} joueurs : au-delà de ${SEUIL_AVERTISSEMENT_JOUEURS}, la rotation gloutonne peut laisser des partenariats ou des adversaires répétés.`,
    );
  }
  if (tours > n - 1) {
    avertissements.push(`${tours} tours pour ${n} joueurs : des partenariats se répètent forcément (au plus ${n - 1} binômes différents par joueur).`);
  }
  if (nbExemptes > 0) {
    avertissements.push(`${nbExemptes} joueur(s) exempté(s) à chaque tour, répartis équitablement.`);
  }

  return {
    graine,
    tours: resultat,
    statistiques: {
      partenariatsDistincts: partenaires.size,
      partenariatsRepetes: repetes(partenaires),
      adversairesRepetes: repetes(adversaires),
      exemptionsParJoueur: Object.fromEntries(exemptions),
      ecartExemptions: Math.max(...nbExemptions) - Math.min(...nbExemptions),
    },
    avertissements,
  };
}
