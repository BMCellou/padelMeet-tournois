// Places disponibles d'un tournoi. L'unité est le joueur : une paire en
// prend 2, un solo 1. `max` null = illimité.

export interface Places {
  illimite: boolean;
  max: number | null;
  occupees: number;
  /** null si illimité. Jamais négatif (le club peut avoir dépassé la limite à la main). */
  restantes: number | null;
  complet: boolean;
}

export function calculerPlaces(max: number | null, occupees: number): Places {
  if (max === null) {
    return { illimite: true, max: null, occupees, restantes: null, complet: false };
  }
  const restantes = Math.max(0, max - occupees);
  return { illimite: false, max, occupees, restantes, complet: restantes === 0 };
}

/** Message d'erreur si `nbJoueurs` ne rentrent pas, sinon null. */
export function refusInscription(places: Places, nbJoueurs: 1 | 2): string | null {
  if (places.illimite || places.restantes === null) return null;
  if (places.restantes >= nbJoueurs) return null;
  if (places.restantes === 0) return "Ce tournoi est complet.";
  return "Il ne reste qu'une place : inscris-toi en solo, le club t'associera à un autre joueur.";
}

export function libellePlaces(places: Places): string | null {
  if (places.illimite || places.restantes === null) return null;
  if (places.complet) return "Complet";
  return places.restantes === 1 ? "1 place restante" : `${places.restantes} places restantes`;
}
