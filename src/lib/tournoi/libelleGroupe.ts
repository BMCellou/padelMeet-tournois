// Libellé d'un groupe : « Poule A » pour une poule du premier tour, « Niveau 1 » pour un groupe du
// second tour d'un format par niveaux (le nom du groupe porte déjà le mot « Niveau »).

export function libelleGroupe(g: { nom: string; niveau?: number | null }): string {
  return g.niveau ? g.nom : `Poule ${g.nom}`;
}
