// Types partagés du moteur de tournoi. Domaine en français, pas d'accès
// base ici : ce sont des objets d'état, jamais des enregistrements ORM.

/** Que faire d'un set à égalité quand le temps limite est écoulé (ex. 4-4 au buzzer). */
export type EgaliteAuBuzzer = "point_en_or" | "jeu_decisif" | "nul_interdit";

/**
 * Ce que le scoreur saisit : des jeux et des sets (padel classique), ou un nombre
 * de points par camp (Americano, Mexicano : une manche à total fixe).
 */
export type ModeScore = "jeux_sets" | "points";

export type MatchFormat = {
  /**
   * « jeux_sets » : comportement historique (sets, jeux, tie-break). « points » : une
   * manche, le vainqueur est le camp au score le plus élevé ; les réglages de sets et de
   * jeux sont sans objet. Absent des formats enregistrés avant son ajout : lire avec
   * `?? "jeux_sets"`.
   */
  modeScore: ModeScore;
  /** Mode points : total de points d'une manche (16, 21, 24, 32…). */
  pointsCible: number;
  /**
   * Mode points : vrai = la manche s'arrête net au total, les deux scores font
   * exactement `pointsCible` (la saisie d'un camp déduit l'autre) ; faux = manche
   * limitée par le temps, les deux scores sont saisis et une égalité est un match nul.
   */
  sommeExacte: boolean;
  nbSetsGagnants: 1 | 2;
  jeuxPourGagner: number;
  ecartRequis: number;
  pointDecisif: boolean;
  choixReceveur: boolean;
  jeuDecisif: {
    actif: boolean;
    declencheA: number;
    points: number;
    ecart: number;
  } | null;
  setDecisifSuperTiebreak: boolean;
  superTiebreakPoints?: number;
  limiteTempsMin: number | null;
  regleFinDeTemps: "leader_gagne" | "finir_le_jeu" | "aucune";
  /**
   * Départage d'une égalité au buzzer, joué après la limite de temps :
   *  - "point_en_or" : un dernier point décide (le scoreur saisit son gagnant) ;
   *  - "jeu_decisif" : un tie-break décide (le scoreur en saisit le score) ;
   *  - "nul_interdit" : un nul est impossible, le scoreur désigne le vainqueur.
   * Sans objet quand le format n'a pas de limite de temps. Absent des
   * formats enregistrés avant son ajout : lire avec `?? "point_en_or"`.
   */
  egaliteAuBuzzer: EgaliteAuBuzzer;
  dureeEstimeeMin: number;
};

export const FORMAT_PAR_DEFAUT: MatchFormat = {
  modeScore: "jeux_sets",
  pointsCible: 24,
  sommeExacte: true,
  nbSetsGagnants: 1,
  jeuxPourGagner: 7,
  ecartRequis: 1,
  pointDecisif: true,
  choixReceveur: true,
  jeuDecisif: { actif: true, declencheA: 6, points: 7, ecart: 2 },
  setDecisifSuperTiebreak: false,
  limiteTempsMin: 25,
  regleFinDeTemps: "leader_gagne",
  egaliteAuBuzzer: "point_en_or",
  dureeEstimeeMin: 25,
};
