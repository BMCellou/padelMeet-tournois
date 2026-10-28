// Colonnes lues par les pages publiques (accueil, page d'un tournoi), en un
// seul endroit : jamais de select("*"), jamais de donnée personnelle. Les
// tests (tests/donnees-publiques.test.ts) échouent si une colonne privée
// s'y glisse ou si une page publique lit directement une table de joueurs.

const SETS = "match_sets(numero, jeux_a, jeux_b, tiebreak_a, tiebreak_b)";

export const COLONNES_PUBLIQUES = {
  accueilClubs: "id, nom, ville",
  accueilTournois: "id, nom, date, statut, genre, niveau, public_slug, club_id",
  tournoi: "id, nom, date, heure_debut, statut, genre, niveau",
  groupes: "id, nom, ordre",
  equipes: "id, nom_affiche",
  terrains: "id, nom",
  classements: "group_id, team_id, joues, v, d, ratio_sets, ratio_jeux, rang",
  matchsPoule: `id, group_id, round, statut, team_a_id, team_b_id, winner_id, court_id, scheduled_at, ${SETS}`,
  matchsTableau: `id, round, bracket_slot, statut, team_a_id, team_b_id, winner_id, next_match_id, next_slot, loser_next_match_id, loser_next_slot, court_id, scheduled_at, ${SETS}`,
  matchClassement: `id, round, statut, team_a_id, team_b_id, winner_id, court_id, scheduled_at, ${SETS}`,
} as const;

/** Clés qui ne doivent jamais figurer dans une charge utile publique (insensible à la casse, snake_case ou camelCase). */
export const CLES_PRIVEES = [
  "email",
  "telephone",
  "canal_rappel",
  "user_id",
  "player_id",
  "password",
  "mot_de_passe",
  "classement_fft",
] as const;

const NORMALISEES = new Set(CLES_PRIVEES.map(normaliser));

function normaliser(cle: string): string {
  return cle.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

/** Toutes les clés privées trouvées, à n'importe quelle profondeur d'un objet ou d'un tableau. */
export function clesPriveesDans(charge: unknown, chemin = ""): string[] {
  if (Array.isArray(charge)) return charge.flatMap((v, i) => clesPriveesDans(v, `${chemin}[${i}]`));
  if (charge === null || typeof charge !== "object") return [];
  return Object.entries(charge as Record<string, unknown>).flatMap(([cle, valeur]) => {
    const ici = NORMALISEES.has(normaliser(cle)) ? [`${chemin ? `${chemin}.` : ""}${cle}`] : [];
    return [...ici, ...clesPriveesDans(valeur, `${chemin ? `${chemin}.` : ""}${cle}`)];
  });
}

/** Garde-fou d'exécution : une page publique qui recevrait une donnée privée plante plutôt que de la servir. */
export function garantirChargePublique(charge: unknown): void {
  const trouvees = clesPriveesDans(charge);
  if (trouvees.length > 0) {
    throw new Error(`Donnée privée dans une charge publique : ${trouvees.join(", ")}`);
  }
}
