// §4.1 — Répartition en poules. Contrainte dure : 4 équipes minimum par
// poule (garantit 3 matchs par équipe). Taille cible 4 ou 5, maximum 7.

const TAILLE_CIBLE_MIN = 4;
const TAILLE_CIBLE_MAX = 5;
const TAILLE_MAX = 7;
const TAILLE_MIN = 4;

export interface RepartitionPoulesOptions {
  nombrePoulesForce?: number;
}

export interface RepartitionPoulesResult {
  nombrePoules: number;
  tailles: number[];
  avertissement?: string;
}

function partitionEquilibree(nombreEquipes: number, nombrePoules: number): number[] {
  const base = Math.floor(nombreEquipes / nombrePoules);
  const reste = nombreEquipes - base * nombrePoules;
  // Les `reste` premières poules reçoivent une équipe de plus.
  return Array.from({ length: nombrePoules }, (_, i) => (i < reste ? base + 1 : base));
}

function scoreRepartition(tailles: number[]): [number, number] {
  const horsCible = tailles.filter((t) => t < TAILLE_CIBLE_MIN || t > TAILLE_CIBLE_MAX).length;
  const ecart = Math.max(...tailles) - Math.min(...tailles);
  return [horsCible, ecart];
}

function scoreMeilleur(a: [number, number], b: [number, number]): boolean {
  if (a[0] !== b[0]) return a[0] < b[0];
  return a[1] < b[1];
}

export function calculerRepartitionPoules(
  nombreEquipes: number,
  options: RepartitionPoulesOptions = {},
): RepartitionPoulesResult {
  if (nombreEquipes < TAILLE_MIN) {
    throw new Error(
      `Au moins ${TAILLE_MIN} équipes sont nécessaires pour former une poule (reçu ${nombreEquipes}).`,
    );
  }

  if (options.nombrePoulesForce !== undefined) {
    const n = options.nombrePoulesForce;
    const tailles = partitionEquilibree(nombreEquipes, n);
    if (tailles.some((t) => t < TAILLE_MIN)) {
      throw new Error(
        `Impossible de former ${n} poule(s) avec ${nombreEquipes} équipes : au moins une poule aurait moins de ${TAILLE_MIN} équipes.`,
      );
    }
    return { nombrePoules: n, tailles };
  }

  const minPoules = Math.max(1, Math.ceil(nombreEquipes / TAILLE_MAX));
  const maxPoules = Math.floor(nombreEquipes / TAILLE_MIN);

  let meilleur: RepartitionPoulesResult | null = null;
  let meilleurScore: [number, number] | null = null;

  for (let n = minPoules; n <= maxPoules; n++) {
    const tailles = partitionEquilibree(nombreEquipes, n);
    if (tailles.some((t) => t < TAILLE_MIN || t > TAILLE_MAX)) continue;
    const score = scoreRepartition(tailles);
    if (meilleurScore === null || scoreMeilleur(score, meilleurScore)) {
      meilleur = { nombrePoules: n, tailles };
      meilleurScore = score;
    }
  }

  if (!meilleur) {
    // Cas 6 ou 7 équipes : la poule unique est la seule option respectant
    // le minimum de 4 par poule.
    meilleur = { nombrePoules: 1, tailles: [nombreEquipes] };
  }

  if (meilleur.nombrePoules === 1 && nombreEquipes > TAILLE_CIBLE_MAX) {
    meilleur.avertissement = `Poule unique de ${nombreEquipes} équipes : ${
      (nombreEquipes * (nombreEquipes - 1)) / 2
    } matchs à jouer, c'est long. Le minimum de ${TAILLE_MIN} équipes par poule ne permet pas d'en faire plusieurs.`;
  }

  return meilleur;
}
