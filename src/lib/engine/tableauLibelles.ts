// Étiquettes lisibles des matchs de la phase finale (« Quart de finale
// n°3 », « Vainqueur du quart n°1 »…), pour afficher une case de tableau
// dont les équipes ne sont pas encore connues. Pur : aucun accès base.

export interface MatchTableauStructure {
  id: string;
  phase: "tableau" | "classement" | "classement_5e";
  round: number;
  bracketSlot: number | null;
  nextMatchId: string | null;
  nextSlot: "a" | "b" | null;
  loserNextMatchId: string | null;
  loserNextSlot: "a" | "b" | null;
}

export interface LibelleMatchTableau {
  /** « Quart de finale n°3 », « Finale », « Match pour la 3e place »… */
  etiquette: string;
  /** Tant que l'équipe n'est pas connue : « Vainqueur du quart n°1 » (null si rien d'alimentant). */
  sourceA: string | null;
  sourceB: string | null;
}

interface Noms {
  etiquette: string;
  /** Avec l'article : « du quart n°3 », « de la demi n°1 ». */
  de: string;
}

function noms(m: MatchTableauStructure, dernierTour: number): Noms {
  if (m.phase === "classement") return { etiquette: "Match pour la 3e place", de: "du match pour la 3e place" };
  if (m.phase === "classement_5e") return { etiquette: "Match pour la 5e place", de: "du match pour la 5e place" };
  const n = (m.bracketSlot ?? 0) + 1;
  if (m.round >= dernierTour) return { etiquette: "Finale", de: "de la finale" };
  if (m.round === dernierTour - 1) return { etiquette: `Demi-finale n°${n}`, de: `de la demi n°${n}` };
  if (m.round === dernierTour - 2) return { etiquette: `Quart de finale n°${n}`, de: `du quart n°${n}` };
  if (m.round === dernierTour - 3) return { etiquette: `8e de finale n°${n}`, de: `du 8e n°${n}` };
  return { etiquette: `Tour ${m.round} n°${n}`, de: `du tour ${m.round} n°${n}` };
}

export function libellerTableau(matchs: MatchTableauStructure[]): Map<string, LibelleMatchTableau> {
  const dernierTour = matchs.filter((m) => m.phase === "tableau").reduce((max, m) => Math.max(max, m.round), 0);
  const parId = new Map(matchs.map((m) => [m.id, noms(m, dernierTour)]));

  const resultat = new Map<string, LibelleMatchTableau>();
  for (const m of matchs) {
    resultat.set(m.id, { etiquette: noms(m, dernierTour).etiquette, sourceA: null, sourceB: null });
  }

  const poser = (cibleId: string | null, slot: "a" | "b" | null, texte: string) => {
    if (!cibleId || !slot) return;
    const cible = resultat.get(cibleId);
    if (!cible) return;
    if (slot === "a") cible.sourceA = texte;
    else cible.sourceB = texte;
  };

  for (const m of matchs) {
    const de = parId.get(m.id)!.de;
    poser(m.nextMatchId, m.nextSlot, `Vainqueur ${de}`);
    poser(m.loserNextMatchId, m.loserNextSlot, `Perdant ${de}`);
  }
  return resultat;
}

/** Ids des matchs dont le résultat alimente chaque match (vainqueurs et perdants). */
export function alimentants(matchs: MatchTableauStructure[]): Map<string, string[]> {
  const resultat = new Map<string, string[]>();
  for (const m of matchs) {
    for (const cible of [m.nextMatchId, m.loserNextMatchId]) {
      if (cible) resultat.set(cible, [...(resultat.get(cible) ?? []), m.id]);
    }
  }
  return resultat;
}
