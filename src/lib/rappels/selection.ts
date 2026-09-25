// Quels matchs méritent un rappel maintenant ?

export interface MatchPlanifie {
  scheduledAt: string | null;
  statut: string;
  teamAId: string | null;
  teamBId: string | null;
}

/** Matchs planifiés, pas encore commencés, entre maintenant et
 * maintenant + délai, avec les deux équipes connues. */
export function matchsDansFenetre<T extends MatchPlanifie>(
  matchs: T[],
  maintenant: Date,
  delaiHeures: number,
): T[] {
  const debut = maintenant.getTime();
  const fin = debut + delaiHeures * 3_600_000;
  return matchs.filter((m) => {
    if (!m.scheduledAt || !m.teamAId || !m.teamBId) return false;
    if (m.statut !== "a_venir" && m.statut !== "pret") return false;
    const t = new Date(m.scheduledAt).getTime();
    return t > debut && t <= fin;
  });
}
