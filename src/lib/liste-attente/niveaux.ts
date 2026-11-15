// Niveau déclaré à l'inscription sur la liste d'attente : l'échelle de 1 à 8 que les joueurs de padel connaissent,
// avec un repère en toutes lettres pour chaque palier.

export const NIVEAUX_LISTE_ATTENTE = [
  { niveau: 1, libelle: "Initiation", aide: "je découvre le padel" },
  { niveau: 2, libelle: "Débutant", aide: "je connais les règles et je joue depuis peu" },
  { niveau: 3, libelle: "Débutant confirmé", aide: "je tiens des échanges et j'utilise les vitres" },
  { niveau: 4, libelle: "Intermédiaire", aide: "je joue régulièrement, les bases sont acquises" },
  { niveau: 5, libelle: "Intermédiaire confirmé", aide: "je construis les points et je varie mon jeu" },
  { niveau: 6, libelle: "Confirmé", aide: "je joue souvent et je maîtrise bien le jeu" },
  { niveau: 7, libelle: "Avancé", aide: "je fais des tournois et je suis à l'aise en compétition" },
  { niveau: 8, libelle: "Expert", aide: "niveau compétition élevé" },
] as const;

export const NIVEAU_MIN = 1;
export const NIVEAU_MAX = 8;

/** « 4 – Intermédiaire » ; le chiffre seul si le niveau est inconnu. */
export function libelleNiveau(niveau: number): string {
  const n = NIVEAUX_LISTE_ATTENTE.find((x) => x.niveau === niveau);
  return n ? `${n.niveau} – ${n.libelle}` : String(niveau);
}
