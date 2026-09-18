// Match de classement pour la 5e place : oppose les deux 3es de poule
// quand ils ne se sont pas qualifiés pour le tableau final — seulement
// dans le cas de deux poules (au-delà, il y aurait plus de deux 3es à
// départager, ce qui demanderait un vrai mini-tableau, hors périmètre).

export interface EquipePouleRang {
  teamId: string;
  groupId: string;
  rang: number | null;
}

export interface Match5e {
  teamAId: string;
  teamBId: string;
}

/**
 * Détermine la paire du match de 5e place, ou null si le cas de figure
 * ne s'applique pas (pas exactement deux poules, pas de 3e dans l'une
 * des poules, ou 3e déjà qualifié pour le tableau).
 */
export function calculerMatch5eDePoule(
  equipes: EquipePouleRang[],
  qualifiesIds: ReadonlySet<string>,
): Match5e | null {
  const groupIds = [...new Set(equipes.map((e) => e.groupId))];
  if (groupIds.length !== 2) return null;

  const troisiemes = groupIds.map((groupId) =>
    equipes.find((e) => e.groupId === groupId && e.rang === 3),
  );

  if (troisiemes.some((e) => e === undefined)) return null;
  if (troisiemes.some((e) => qualifiesIds.has(e!.teamId))) return null;

  return { teamAId: troisiemes[0]!.teamId, teamBId: troisiemes[1]!.teamId };
}
