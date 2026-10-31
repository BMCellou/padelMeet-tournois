// Abstraction « format d'animation » (docs/formats-animation.md §4.1) : une
// stratégie par format. Les écrans et les routes ne connaissent jamais un format
// en particulier : ils demandent au registre (formats/index.ts) et s'appuient sur
// les propriétés déclarées (uniteClassement, calendrier, partenaire, modeScore,
// aUnTableauFinal) — jamais sur le code du format.
//
// Pur : aucun accès base, aucune horloge (comme tout lib/engine/).

import type { CritereDepartage, EquipeClassee, MatchTermine } from "../classement";
import type { EquipePouleRang, Match5e } from "../classement5e";
import type { DonneesClassementFinal, EquipeClassementFinal } from "../classementFinal";
import type { EtatQualification, ImpactQualifies } from "../impactQualifies";
import type { Court, MatchAPlanifier, MatchPlanifie, MatchTableauAPlanifier, OccupationExistante, PlanificationOptions } from "../planification";
import type { RepartitionPoulesOptions, RepartitionPoulesResult } from "../poules";
import type { ClassementPoule, QualificationResult } from "../qualification";
import type { MatchTableau, Qualifie } from "../tableau";
import type { LibelleMatchTableau, MatchTableauStructure } from "../tableauLibelles";
import type { EquipeAvecSeed, Poule } from "../tirage";
import type { Tour as TourDeGroupe } from "../tours";
import type {
  ClassementDeNiveau,
  ClassementDePoule,
  EstimationNiveaux,
  LigneClassementNiveaux,
  Niveau,
  RepartitionNiveaux,
} from "../niveaux";
import type { DefinitionPhases, PhaseDeFormat } from "../formatPhases";

export type { PhaseDeFormat } from "../formatPhases";

// ── Identité et propriétés d'un format ──────────────────────────────────

/** Code d'un format enregistré (valeur de tournaments.format_animation). */
export type CodeFormat = "poules_tableau" | "americano" | "poules_niveaux";

export interface Validation {
  ok: boolean;
  /** Pourquoi l'effectif ne convient pas (ok = false). */
  message?: string;
  /** Avertissement sans blocage (ok = true), ex. poule unique très longue. */
  avertissement?: string;
}

// ── État d'un tournoi, tel que le voit un format ────────────────────────

/** Une unité de participation : une équipe, ou un joueur selon `uniteClassement`. */
export interface Participant extends EquipeAvecSeed {
  sexe?: "H" | "F";
  /** Plus petit = meilleur niveau. */
  niveau?: number;
}

export interface GroupeEtat {
  id: string;
  nom: string;
  participantIds: string[];
  /** Formats à second tour par niveaux : rang des équipes réunies (1 = les premiers de poule) ; absent pour une poule du premier tour. */
  niveau?: number | null;
}

export interface PlacementEtat {
  terrainId: string;
  debut: string;
  fin: string;
}

/** Un match connu du format, joué ou non. */
export interface MatchEtat {
  id: string;
  /** « groupe » = phase de groupes (poules) ; « finale » = tableau ; « classement » / « classement_5e » = matchs de classement ; « manche » = manche d'un format à partenaires tournants. */
  phase: "groupe" | "finale" | "classement" | "classement_5e" | "manche";
  groupeId: string | null;
  tour: number;
  teamAId: string | null;
  teamBId: string | null;
  /** Validé (ou forfait) : le résultat est définitif. */
  termine: boolean;
  vainqueurId: string | null;
  /** Résultat chiffré, quand le match est terminé. */
  resultat?: MatchTermine;
  placement?: PlacementEtat;
  nextMatchId?: string | null;
  nextSlot?: "a" | "b" | null;
  loserNextMatchId?: string | null;
  loserNextSlot?: "a" | "b" | null;
  bracketSlot?: number | null;
}

/** Configuration propre au format (tournaments.config_animation + réglages du tournoi). */
export interface ConfigAnimation {
  nbQualifies?: number;
  criteres?: CritereDepartage[];
  /** Nombre de poules imposé par l'admin (sinon calculé). */
  nombreGroupesForce?: number;
  /** Formats à rotation (Americano) : nombre de manches (tours) de la journée. */
  nbTours?: number;
  /** Classement individuel : critères de départage, dans l'ordre (sinon défaut du format). */
  criteresJoueurs?: CritereJoueur[];
  /** Classement individuel : total brut, ou points par manche (effectifs non multiples de 4). */
  modeClassement?: ModeClassementJoueurs;
}

export type CritereJoueur = "points_marques" | "difference" | "victoires" | "confrontation_directe" | "moins_exemptions";
export type ModeClassementJoueurs = "total" | "par_manche";

/** Équipe éphémère : le binôme d'une manche (teams.ephemere = true, tour_origine renseigné). */
export interface EquipeEphemere {
  id: string;
  joueurIds: [string, string];
  tourOrigine: number;
}

export interface EtatTournoi {
  participants: Participant[];
  terrains: Court[];
  config: ConfigAnimation;
  /** Graine du tirage, mémorisée pour pouvoir le rejouer à l'identique. */
  graine: number;
  /** Heure de début, durées, repos : requis pour que les tours soient placés sur les terrains. */
  planification?: PlanificationOptions;
  /** Composition des groupes déjà tirée ; sinon le format la tire. */
  groupes?: GroupeEtat[];
  matchs: MatchEtat[];
  /** Équipes éphémères déjà créées (formats à partenaires tournants) : id d'équipe → joueurs. */
  equipesEphemeres?: EquipeEphemere[];
}

// ── Sorties ─────────────────────────────────────────────────────────────

export interface MatchPrevu {
  id: string;
  phase: MatchEtat["phase"];
  groupeId: string | null;
  tour: number;
  teamAId: string | null;
  teamBId: string | null;
  bracketSlot?: number | null;
  nextMatchId?: string | null;
  nextSlot?: "a" | "b" | null;
  loserNextMatchId?: string | null;
  loserNextSlot?: "a" | "b" | null;
  /** Terrain et créneau, quand l'état fournit les options de planification. */
  placement?: PlacementEtat;
  /** Terrain de la manche (formats à rotation), même sans horaire. */
  terrainId?: string;
  /** Formats à partenaires tournants : les deux binômes éphémères de cette manche, à créer. */
  equipesEphemeres?: [EquipeEphemere, EquipeEphemere];
}

export interface Tour {
  numero: number;
  matchs: MatchPrevu[];
  /** Groupes que ce tour crée (second tour par niveaux) : les matchs y renvoient par leur `groupeId`. */
  groupes?: GroupeEtat[];
  /** Participants au repos ce tour-là (poule de taille impaire). */
  exempts: { groupeId: string | null; participantId: string }[];
}

export interface LigneClassement {
  rang: number;
  participantId: string;
  groupeId: string | null;
  joues: number;
  victoires: number;
  defaites: number;
  /** Détail du format (sets, jeux, ratios…) tel que calculé par le moteur (formats d'équipes). */
  detail?: EquipeClassee;
  /** Formats à classement individuel. */
  pointsMarques?: number;
  pointsEncaisses?: number;
  difference?: number;
  toursExempt?: number;
  /** Points marqués par manche jouée (0 sans manche) : le mode « points par manche ». */
  pointsParManche?: number;
}

// ── Capacités de phase de groupes et de phase finale ────────────────────
// Le déroulé d'un format à poules est par étapes (tirage, puis calendrier, puis
// scores, puis tableau) : chaque étape appelle l'opération correspondante. Un format
// qui n'a pas de phase de groupes (ou de phase finale) ne définit pas la capacité ;
// les écrans testent sa présence, jamais le code du format.

export interface OperationsPhaseDeGroupes {
  /** Répartition de l'effectif en groupes. Lève si impossible. */
  repartir(effectif: number, options?: { nombreGroupesForce?: number }): RepartitionGroupes;
  /** Tirage au sort reproductible (têtes de série réparties en serpentin). */
  tirer(participants: EquipeAvecSeed[], tailles: number[], graine: number): CompositionTirage;
  /** Tours d'un groupe (algorithme du cercle) : une rencontre par duo, un exempt par tour impair. */
  toursDuGroupe(participantIds: string[]): TourDeGroupe[];
  /** Placement glouton des matchs sur les terrains. */
  planifier(matchs: MatchAPlanifier[], terrains: Court[], options: PlanificationOptions): MatchPlanifie[];
  /** Classement d'un groupe, critères de départage dans l'ordre donné. */
  classerGroupe(matchs: MatchTermine[], participantIds: string[], criteres: CritereDepartage[]): EquipeClassee[];
}

export type RepartitionGroupes = RepartitionPoulesResult;
export type OptionsRepartition = RepartitionPoulesOptions;
export interface CompositionTirage {
  poules: Poule[];
}

export interface OperationsPhaseFinale {
  /** Sélection des qualifiés d'après les classements de groupe. */
  qualifier(classements: ClassementPoule[], nbQualifies: number): QualificationResult;
  /** Arbre à élimination directe (+ match pour la 3e place), équipes du premier tour placées. */
  construireTableau(qualifies: Qualifie[]): MatchTableau[];
  /** Emplacements (terrain + créneau) du tableau, même sans équipes connues. */
  planifierTableau(
    matchs: MatchTableauAPlanifier[],
    terrains: Court[],
    options: PlanificationOptions,
    existants?: OccupationExistante[],
  ): MatchPlanifie[];
  /** Match de classement entre les deux 3es de poule non qualifiés (null si le cas ne s'applique pas). */
  matchDeClassementDesNonQualifies(equipes: EquipePouleRang[], qualifiesIds: ReadonlySet<string>): Match5e | null;
  /** Classement final de l'arbre, rangs ex æquo compris. */
  classementFinal(donnees: DonneesClassementFinal): EquipeClassementFinal[];
  /** Effet d'une correction de score de groupe sur la liste des qualifiés. */
  impactSurQualifies(avant: EtatQualification, apres: EtatQualification): ImpactQualifies;
  /** Étiquettes (« Quart de finale n°1 ») et provenance des équipes inconnues. */
  etiqueterTableau(matchs: MatchTableauStructure[]): Map<string, LibelleMatchTableau>;
  /** Matchs dont le résultat alimente chaque match. */
  alimentants(matchs: MatchTableauStructure[]): Map<string, string[]>;
}

// ── Capacité de second tour par niveaux ─────────────────────────────────
// Un premier tour de poules, puis des poules réunissant les équipes de même rang. Les écrans
// testent la présence de cette capacité, jamais le code du format.

export interface OperationsNiveaux {
  /** Autant de poules que possible (3 équipes minimum), ou le nombre imposé. Lève si impossible. */
  repartir(effectif: number, options?: { nombreGroupesForce?: number }): RepartitionNiveaux;
  /** Niveaux du second tour d'après les classements du premier. */
  composer(classements: ClassementDePoule[]): Niveau[];
  /** Classement de la 1re à la dernière place. */
  classementFinal(niveaux: ClassementDeNiveau[]): LigneClassementNiveaux[];
  /** Matchs, matchs par équipe et créneaux, pour une répartition donnée. */
  estimer(tailles: number[], terrains: number): EstimationNiveaux;
}

// ── Capacité de rotation (partenaires tournants) ────────────────────────
// Réglages et estimations d'un format où l'on change de partenaire à chaque tour. Les
// écrans (création du tournoi, inscriptions) testent sa présence, jamais le code du format.

export interface EstimationRotation {
  /** Durée de la journée : manches enchaînées, pauses de rotation entre les tours. */
  dureeMin: number;
  manchesParTour: number;
  nbManches: number;
  /** Joueurs au repos à chaque tour (0 si l'effectif est un multiple de 4 et les terrains suffisent). */
  exemptesParTour: number;
}

export interface OperationsRotation {
  /** Nombre de tours proposé pour cet effectif. */
  nbToursParDefaut(effectif: number): number;
  /** Total de points d'une manche proposé par défaut. */
  pointsCibleParDefaut: number;
  exemptesParTour(effectif: number, terrains: number): number;
  estimer(p: { effectif: number; terrains: number; nbTours: number; dureeMancheMin: number; pauseMin: number }): EstimationRotation;
}

// ── L'interface ─────────────────────────────────────────────────────────

export interface FormatAnimation extends DefinitionPhases {
  code: CodeFormat;
  nom: string;
  description: string;

  uniteClassement: "equipe" | "joueur";
  calendrier: "statique" | "dynamique";
  partenaire: "fixe" | "tournant";
  modeScore: "jeux_sets" | "points";
  aUnTableauFinal: boolean;

  /**
   * Phases du format, auxquelles on peut donner un format de match propre. L'écran de
   * réglage par phase et toute étiquette de phase lisent cette liste, jamais une constante.
   * Poules + tableau : poules, quarts, demies, finale, matchs de classement ; Americano : manches.
   */
  phases: readonly PhaseDeFormat[];

  /** Nombre d'inscrits acceptable, et message d'aide si non. */
  validerEffectif(n: number, terrains: number): Validation;

  /** Statique : tous les tours d'un coup. Dynamique : le tour suivant uniquement. */
  genererTours(etat: EtatTournoi): Tour[];

  /** Appelée après chaque validation de score : un tour de plus, ou rien. */
  tourSuivant(etat: EtatTournoi): Tour | null;

  classement(etat: EtatTournoi): LigneClassement[];
  estTermine(etat: EtatTournoi): boolean;

  /** Phase de groupes (poules) : absente des formats qui n'en ont pas. */
  groupes?: OperationsPhaseDeGroupes;
  /** Phase finale (qualification + tableau) : présente ssi `aUnTableauFinal`. */
  phaseFinale?: OperationsPhaseFinale;
  /** Rotation des partenaires : présente ssi `partenaire === "tournant"`. */
  rotation?: OperationsRotation;
  /** Second tour par niveaux : présente ssi le format classe par niveaux plutôt que par tableau. */
  niveaux?: OperationsNiveaux;
}
