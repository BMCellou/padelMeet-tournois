// Format « poules de niveau » : un premier tour de poules, puis un second tour où
// les équipes de même rang se retrouvent. Les 1ers de chaque poule jouent ensemble
// (niveau 1), puis les 2es (niveau 2), etc. Dès 4 équipes, chacune joue au moins 3 matchs
// (poule de 4 ou plus, ou poule de 3 puis un niveau d'au moins 2 équipes), et le
// classement de la 1re à la dernière place est joué plutôt que calculé.
//
// Pur : aucun accès base, aucune horloge (comme tout lib/engine/).

import type { EquipeClassee } from "./classement";

/** Effectif minimal : une poule d'au moins 3 équipes, et au moins 4 pour garantir 3 matchs en poule unique. */
export const EFFECTIF_MIN_NIVEAUX = 4;
/** Taille minimale d'une poule du premier tour. */
export const TAILLE_MIN_POULE_NIVEAUX = 3;
/** Au-delà, un niveau compte trop d'équipes pour tenir dans une journée : l'écran le signale. */
export const TAILLE_NIVEAU_CONSEILLEE_MAX = 5;

export interface RepartitionNiveaux {
  /** Taille de chaque poule du premier tour, de la plus grande à la plus petite. */
  tailles: number[];
  /** Taille de chaque niveau du second tour (niveau 1 d'abord). Un niveau d'une équipe ne joue pas. */
  niveaux: number[];
  avertissement?: string;
}

/** Nombre maximal de poules d'au moins 3 équipes. */
export function nombrePoulesMaxNiveaux(effectif: number): number {
  return Math.floor(effectif / TAILLE_MIN_POULE_NIVEAUX);
}

/**
 * Répartit l'effectif en autant de poules que possible (3 équipes au minimum chacune),
 * sauf si l'organisateur en impose un nombre. Les poules sont équilibrées : elles
 * diffèrent d'au plus une équipe. Lève si l'effectif ne convient pas.
 */
export function repartirPoulesNiveaux(effectif: number, options: { nombrePoulesForce?: number } = {}): RepartitionNiveaux {
  if (!Number.isInteger(effectif) || effectif < EFFECTIF_MIN_NIVEAUX) {
    throw new Error(`Il faut au moins ${EFFECTIF_MIN_NIVEAUX} équipes pour ce format (reçu ${effectif}).`);
  }
  const max = nombrePoulesMaxNiveaux(effectif);
  const forcé = options.nombrePoulesForce;
  if (forcé !== undefined && (!Number.isInteger(forcé) || forcé < 1 || forcé > max)) {
    throw new Error(`Avec ${effectif} équipes, le nombre de poules doit être entre 1 et ${max} (3 équipes minimum par poule).`);
  }
  const nbPoules = forcé ?? max;

  const base = Math.floor(effectif / nbPoules);
  const reste = effectif % nbPoules;
  const tailles = Array.from({ length: nbPoules }, (_, i) => base + (i < reste ? 1 : 0));

  const niveaux = tailleDesNiveaux(tailles);
  const resultat: RepartitionNiveaux = { tailles, niveaux };

  if (nbPoules === 1) {
    resultat.avertissement = `Une seule poule de ${effectif} équipes : pas de second tour, le classement de poule est le classement final.`;
  } else {
    const trop = niveaux.filter((n) => n > TAILLE_NIVEAU_CONSEILLEE_MAX);
    if (trop.length > 0) {
      resultat.avertissement = `Les niveaux comptent jusqu'à ${Math.max(...niveaux)} équipes (${Math.max(...niveaux) - 1} matchs chacune au second tour) : réduis le nombre de poules pour alléger la journée.`;
    }
  }
  return resultat;
}

/** Niveau k = les équipes de rang k de chaque poule qui en compte au moins k. */
export function tailleDesNiveaux(tailles: number[]): number[] {
  const max = Math.max(...tailles);
  return Array.from({ length: max }, (_, i) => tailles.filter((t) => t >= i + 1).length);
}

// ── Composition des niveaux ─────────────────────────────────────────────

export interface ClassementDePoule {
  groupId: string;
  /** Équipes dans l'ordre du classement (la première est la meilleure). */
  equipes: EquipeClassee[];
}

export interface Niveau {
  /** 1 = niveau des premiers de poule. */
  niveau: number;
  equipeIds: string[];
  /** Ce niveau joue : une tournante complète (3 équipes et plus) ou un seul match de classement (2). */
  joue: boolean;
}

/**
 * Compose les niveaux du second tour d'après les classements de poule. L'ordre des équipes
 * à l'intérieur d'un niveau suit l'ordre des poules (déterministe). Un classement en
 * égalité parfaite est départagé par l'ordre dans lequel le moteur le renvoie.
 */
export function composerNiveaux(classements: ClassementDePoule[], exclus: ReadonlySet<string> = new Set()): Niveau[] {
  const max = Math.max(0, ...classements.map((c) => c.equipes.length));
  const niveaux: Niveau[] = [];
  for (let k = 1; k <= max; k++) {
    // `exclus` : les équipes déjà qualifiées pour une phase finale ne rejouent pas dans un niveau.
    const equipeIds = classements.flatMap((c) =>
      c.equipes[k - 1] && !exclus.has(c.equipes[k - 1].teamId) ? [c.equipes[k - 1].teamId] : [],
    );
    niveaux.push({ niveau: k, equipeIds, joue: equipeIds.length >= 2 });
  }
  return niveaux;
}

/**
 * Deux équipes d'un même niveau viennent de poules différentes : elles ne se sont donc jamais
 * rencontrées au premier tour. Vérifie cette garantie (elle sert de contrôle dans les tests).
 */
export function niveauxSansRevanche(niveaux: Niveau[], pouleDe: (equipeId: string) => string): boolean {
  return niveaux.every((n) => new Set(n.equipeIds.map(pouleDe)).size === n.equipeIds.length);
}

export interface EgaliteTranchee {
  groupId: string;
  /** Rang partagé dans la poule par les équipes que rien n'a départagées. */
  rang: number;
  equipeIds: string[];
}

/**
 * Équipes d'une même poule à égalité parfaite (aucun critère ne les sépare) alors qu'elles tombent
 * dans des niveaux différents : l'ordre du classement les place malgré tout l'une avant l'autre.
 * Sert à tracer cette décision ; elle ne change pas la composition.
 */
export function egalitesTranchees(classements: ClassementDePoule[]): EgaliteTranchee[] {
  const resultat: EgaliteTranchee[] = [];
  for (const c of classements) {
    const parRang = new Map<number, string[]>();
    for (const e of c.equipes) parRang.set(e.rang, [...(parRang.get(e.rang) ?? []), e.teamId]);
    for (const [rang, equipeIds] of parRang) if (equipeIds.length > 1) resultat.push({ groupId: c.groupId, rang, equipeIds });
  }
  return resultat;
}

// ── Classement final ────────────────────────────────────────────────────

export interface ClassementDeNiveau {
  niveau: number;
  /** Équipes classées à l'intérieur du niveau (mini-poule ou match de classement). */
  equipes: Pick<EquipeClassee, "teamId" | "rang">[];
}

export interface LigneClassementNiveaux {
  /** Place de 1 à N ; deux équipes ex æquo (non départagées par aucun critère) partagent la leur. */
  rang: number;
  equipeId: string;
  niveau: number;
}

/**
 * Classement de la 1re à la dernière place : les équipes du niveau 1 occupent les premières
 * places dans l'ordre de leur mini-poule, puis celles du niveau 2, etc. `placesDejaPrises` :
 * nombre de places occupées avant le niveau 1 (les qualifiés d'une phase finale).
 */
export function classementFinalNiveaux(niveaux: ClassementDeNiveau[], placesDejaPrises = 0): LigneClassementNiveaux[] {
  const lignes: LigneClassementNiveaux[] = [];
  let decalage = placesDejaPrises;
  for (const n of [...niveaux].sort((a, b) => a.niveau - b.niveau)) {
    for (const e of n.equipes) {
      lignes.push({ rang: decalage + e.rang, equipeId: e.teamId, niveau: n.niveau });
    }
    decalage += n.equipes.length;
  }
  return lignes;
}

// ── Estimation ──────────────────────────────────────────────────────────

export interface EstimationNiveaux {
  nbMatchsPremierTour: number;
  nbMatchsSecondTour: number;
  nbMatchs: number;
  /** Matchs joués par l'équipe qui en joue le moins / le plus. */
  matchsMin: number;
  matchsMax: number;
  /** Nombre de créneaux au minimum (tous les terrains occupés à chaque créneau). */
  creneauxMin: number;
}

const matchsDe = (taille: number) => (taille >= 2 ? (taille * (taille - 1)) / 2 : 0);

/**
 * Compte les matchs et borne le nombre de créneaux pour une répartition donnée. Le placement réel,
 * qui respecte le repos entre deux matchs, peut demander un peu plus ; les deux tours sont toujours
 * joués l'un après l'autre (le second dépend du classement du premier).
 */
export function estimerNiveaux(tailles: number[], terrains: number): EstimationNiveaux {
  const niveaux = tailleDesNiveaux(tailles);
  const nbMatchsPremierTour = tailles.reduce((s, t) => s + matchsDe(t), 0);
  const nbMatchsSecondTour = tailles.length > 1 ? niveaux.reduce((s, n) => s + matchsDe(n), 0) : 0;

  // Matchs d'une équipe : sa poule (taille - 1) puis son niveau (taille du niveau - 1, 0 si seule).
  const parEquipe: number[] = [];
  tailles.forEach((t) => {
    for (let rang = 1; rang <= t; rang++) {
      const niveau = tailles.length > 1 ? niveaux[rang - 1] : 1;
      parEquipe.push(t - 1 + Math.max(0, niveau - 1));
    }
  });

  const parTerrain = (matchs: number) => (matchs === 0 ? 0 : Math.ceil(matchs / Math.max(1, terrains)));
  return {
    nbMatchsPremierTour,
    nbMatchsSecondTour,
    nbMatchs: nbMatchsPremierTour + nbMatchsSecondTour,
    matchsMin: Math.min(...parEquipe),
    matchsMax: Math.max(...parEquipe),
    creneauxMin: parTerrain(nbMatchsPremierTour) + parTerrain(nbMatchsSecondTour),
  };
}
