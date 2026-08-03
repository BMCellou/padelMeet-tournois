// Types partagés du moteur de tournoi. Domaine en français, pas d'accès
// base ici : ce sont des objets d'état, jamais des enregistrements ORM.

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
  dureeEstimeeMin: 25,
};
