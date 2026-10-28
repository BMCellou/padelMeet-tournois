// Annulation d'une inscription par le participant : possible jusqu'à 48 h avant le début du
// tournoi. Pur : l'horloge est un paramètre (jamais la date système).

export const DELAI_ANNULATION_HEURES = 48;

/** Dernier instant où l'annulation en ligne est permise : début du tournoi − 48 h. */
export function limiteAnnulation(debutISO: string, delaiHeures = DELAI_ANNULATION_HEURES): Date {
  return new Date(new Date(debutISO).getTime() - delaiHeures * 3_600_000);
}

export type VerdictAnnulation =
  | { possible: true; limite: Date }
  | { possible: false; raison: "tournoi_non_ouvert" | "delai_depasse"; limite: Date; message: string };

/**
 * `statut` : seul un tournoi encore « publié » (inscriptions ouvertes, rien de commencé) accepte une
 * annulation. Une fois la limite atteinte, l'annulation en ligne n'est plus permise : le
 * participant doit contacter l'organisateur.
 */
export function verdictAnnulation(statut: string, debutISO: string, maintenant: Date): VerdictAnnulation {
  const limite = limiteAnnulation(debutISO);
  if (statut !== "publie") {
    return {
      possible: false,
      raison: "tournoi_non_ouvert",
      limite,
      message: "Ce tournoi a commencé ou est terminé : l'annulation en ligne n'est plus possible.",
    };
  }
  if (maintenant.getTime() >= limite.getTime()) {
    return {
      possible: false,
      raison: "delai_depasse",
      limite,
      message: `L'annulation en ligne n'est possible que jusqu'à ${DELAI_ANNULATION_HEURES} h avant le début du tournoi. Contacte l'organisateur.`,
    };
  }
  return { possible: true, limite };
}

/** « samedi 10 octobre à 09:00 », en heure de Paris. */
export function formaterLimite(limite: Date): string {
  const jour = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(limite);
  const heure = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(limite);
  return `${jour} à ${heure}`;
}
