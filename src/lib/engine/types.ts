// Types partagés du moteur de tournoi. Domaine en français, pas d'accès
// base ici : ce sont des objets d'état, jamais des enregistrements ORM.

/** Que faire d'un set à égalité quand le temps limite est écoulé (ex. 4-4 au buzzer). */
export type EgaliteAuBuzzer = "point_en_or" | "jeu_decisif" | "nul_interdit";

export type MatchFormat = {
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
