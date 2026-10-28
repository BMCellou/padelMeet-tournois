// Les joueurs seuls : une inscription solo passe de « en attente » (à valider
// par le club) à « validée » (acceptée, mais sans équipe pour l'instant), puis
// le joueur est placé dans une équipe lors de l'appariement. Une inscription
// solo déjà placée en équipe garde le statut « valide » : ce qui distingue un
// joueur validé encore sans binôme, c'est l'absence d'équipe dans le tournoi.

export interface SoloInscrit {
  statut: string;
  playerId: string;
}

export interface SolosRepartis<T extends SoloInscrit> {
  /** À accepter ou refuser. */
  aValider: T[];
  /** Acceptés, toujours sans équipe : ils attendent l'appariement. */
  valides: T[];
}

/**
 * `joueursEnEquipe` : les joueurs déjà membres d'une équipe de ce tournoi.
 */
export function repartirSolos<T extends SoloInscrit>(
  solos: T[],
  joueursEnEquipe: ReadonlySet<string>,
): SolosRepartis<T> {
  return {
    aValider: solos.filter((s) => s.statut === "en_attente"),
    valides: solos.filter((s) => s.statut === "valide" && !joueursEnEquipe.has(s.playerId)),
  };
}

/** Les joueurs seuls que l'appariement doit placer en équipe : à valider ou déjà validés. */
export function solosAApparier<T extends SoloInscrit>(
  solos: T[],
  joueursEnEquipe: ReadonlySet<string>,
): T[] {
  const { aValider, valides } = repartirSolos(solos, joueursEnEquipe);
  return [...aValider, ...valides];
}
