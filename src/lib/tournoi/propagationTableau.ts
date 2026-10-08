// Propagation d'un résultat de tableau vers les matchs suivants (§4.8). Pure : renvoie
// les mises à jour à écrire. Un match sans vainqueur (nul) ne peut jamais alimenter
// le tableau : le nul n'existe que sur la phase « manche » (voir nulAutorise).

export interface MatchTableauAPropager {
  team_a_id: string | null;
  team_b_id: string | null;
  next_match_id: string | null;
  next_slot: string | null;
  loser_next_match_id: string | null;
  loser_next_slot: string | null;
}

export interface MiseAJourPropagation {
  matchId: string;
  champ: { team_a_id: string } | { team_b_id: string };
}

export function calculerPropagationTableau(
  match: MatchTableauAPropager,
  winnerId: string | null | undefined,
): MiseAJourPropagation[] {
  if (!winnerId) {
    throw new Error("Propagation impossible : un match de tableau sans vainqueur (nul) ne peut pas alimenter le tableau.");
  }

  const maj: MiseAJourPropagation[] = [];

  if (match.next_match_id) {
    maj.push({
      matchId: match.next_match_id,
      champ: match.next_slot === "a" ? { team_a_id: winnerId } : { team_b_id: winnerId },
    });
  }

  if (match.loser_next_match_id) {
    const loserId = winnerId === match.team_a_id ? match.team_b_id : match.team_a_id;
    if (!loserId) throw new Error("Propagation impossible : perdant inconnu.");
    maj.push({
      matchId: match.loser_next_match_id,
      champ: match.loser_next_slot === "a" ? { team_a_id: loserId } : { team_b_id: loserId },
    });
  }

  return maj;
}
