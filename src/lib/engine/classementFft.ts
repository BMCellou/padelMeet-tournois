// Classement FFT saisi en texte libre (« 15/1 », « 30/2 », « NC »…) converti
// en niveau numérique pour l'appariement « Équilibré ». Jamais d'ordre
// alphabétique : « 30/2 » ne se classe pas devant « 4/6 » parce que « 3 » < « 4 ».

/** Du meilleur au moins bon (échelle officielle FFT, du haut de l'échelle jusqu'à « NC »). */
export const ORDRE_CLASSEMENT_FFT = [
  "promotion",
  "-30",
  "-15",
  "-4/6",
  "-2/6",
  "0",
  "1/6",
  "2/6",
  "3/6",
  "4/6",
  "5/6",
  "15",
  "15/1",
  "15/2",
  "15/3",
  "15/4",
  "15/5",
  "30",
  "30/1",
  "30/2",
  "30/3",
  "30/4",
  "30/5",
  "40",
  "nc",
] as const;

const RANG_PAR_CLASSEMENT: ReadonlyMap<string, number> = new Map(
  ORDRE_CLASSEMENT_FFT.map((c, i) => [c, i]),
);

/** Niveau d'un joueur dont le classement est absent ou non reconnu : sous « NC ». */
export const NIVEAU_INCONNU = ORDRE_CLASSEMENT_FFT.length;

function normaliser(texte: string): string {
  return texte
    .trim()
    .toLowerCase()
    .replace(/[−–—]/g, "-") // moins typographiques
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s+/g, "")
    .replace(/^n\.?c\.?$/, "nc")
    .replace(/^prom(otion)?$/, "promotion");
}

/**
 * Niveau numérique d'un classement FFT : 0 = meilleur, plus grand = moins
 * bon. Une valeur vide ou non reconnue est classée tout en bas (jamais une
 * erreur : un joueur mal renseigné ne doit pas bloquer l'appariement).
 */
export function niveauDepuisClassementFft(texte: string | null | undefined): number {
  if (!texte) return NIVEAU_INCONNU;
  return RANG_PAR_CLASSEMENT.get(normaliser(texte)) ?? NIVEAU_INCONNU;
}

export function classementFftReconnu(texte: string | null | undefined): boolean {
  return !!texte && RANG_PAR_CLASSEMENT.has(normaliser(texte));
}
