// §4.9 — Classement final. Pas de petite finale (décision arrêtée) : les
// deux demi-finalistes battus sont 3es ex æquo, quel que soit le mode de
// départage choisi — celui-ci ne sert qu'aux paliers 5-8 et 9+.

export interface DonneesClassementFinal {
  finaleVainqueurId: string;
  finalePerdantId: string;
  demiFinalesPerdantIds: string[];
  /** Perdants de quarts, déjà triés du meilleur au moins bon (5e à 8e). */
  quartsPerdantIdsTries: string[];
  /** Équipes non qualifiées, déjà triées du meilleur au moins bon (9e et suivants). */
  nonQualifieIdsTries: string[];
}

export interface EquipeClassementFinal {
  teamId: string;
  rang: number;
}

export function classementFinal(donnees: DonneesClassementFinal): EquipeClassementFinal[] {
  const resultat: EquipeClassementFinal[] = [];

  resultat.push({ teamId: donnees.finaleVainqueurId, rang: 1 });
  resultat.push({ teamId: donnees.finalePerdantId, rang: 2 });

  for (const id of donnees.demiFinalesPerdantIds) {
    resultat.push({ teamId: id, rang: 3 });
  }

  let rang = 3 + donnees.demiFinalesPerdantIds.length;
  for (const id of donnees.quartsPerdantIdsTries) {
    resultat.push({ teamId: id, rang });
    rang++;
  }
  for (const id of donnees.nonQualifieIdsTries) {
    resultat.push({ teamId: id, rang });
    rang++;
  }

  return resultat;
}

/**
 * §4.9 mode "jeux_gagnes_tournoi" — cumul du total de jeux gagnés par
 * équipe sur tout le tournoi (poules + tableau confondus), à tenir à jour
 * dès le premier match validé.
 */
export interface MatchTermineTournoi {
  teamAId: string;
  teamBId: string;
  jeuxA: number;
  jeuxB: number;
}

export function cumulJeuxGagnesTournoi(
  matches: MatchTermineTournoi[],
  equipeIds: string[],
): { teamId: string; jeuxGagnes: number }[] {
  const cumul = new Map<string, number>(equipeIds.map((id) => [id, 0]));
  for (const m of matches) {
    if (cumul.has(m.teamAId)) cumul.set(m.teamAId, cumul.get(m.teamAId)! + m.jeuxA);
    if (cumul.has(m.teamBId)) cumul.set(m.teamBId, cumul.get(m.teamBId)! + m.jeuxB);
  }
  return equipeIds
    .map((teamId) => ({ teamId, jeuxGagnes: cumul.get(teamId)! }))
    .sort((a, b) => b.jeuxGagnes - a.jeuxGagnes);
}
