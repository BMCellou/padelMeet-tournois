// Niveaux proposés à l'inscription sur la liste d'attente : un choix simple, sans jargon de classement.

export const NIVEAUX_LISTE_ATTENTE = [
  { code: "debutant", libelle: "Débutant", aide: "Je découvre ou je joue depuis peu" },
  { code: "intermediaire", libelle: "Intermédiaire", aide: "Je joue régulièrement, les bases sont acquises" },
  { code: "confirme", libelle: "Confirmé", aide: "Je joue souvent et je maîtrise bien le jeu" },
  { code: "competiteur", libelle: "Compétiteur", aide: "Je fais des tournois classés" },
] as const;

export type CodeNiveau = (typeof NIVEAUX_LISTE_ATTENTE)[number]["code"];

export const CODES_NIVEAU = NIVEAUX_LISTE_ATTENTE.map((n) => n.code) as [CodeNiveau, ...CodeNiveau[]];

export function libelleNiveau(code: string): string {
  return NIVEAUX_LISTE_ATTENTE.find((n) => n.code === code)?.libelle ?? code;
}
