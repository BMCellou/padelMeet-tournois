// Format « poules de niveau » : un premier tour de poules (autant que possible, 3 équipes
// au minimum chacune), puis un second tour dont la composition dépend des classements,
// d'où un calendrier dynamique. Deux variantes, choisies à la création du tournoi :
//
//  - « Poules de niveau » : les équipes de même rang se retrouvent (les 1ers ensemble, les
//    2es ensemble, etc.). Pas de tableau : le classement de la 1re à la dernière place est
//    celui des niveaux, entièrement joué.
//  - « Poules de niveau + phase finale » : les meilleures équipes (le nombre de qualifiés du
//    tournoi) jouent un tableau — demi-finales, finale, match pour la 3e place — et les
//    autres se classent dans des niveaux, en même temps que le tableau. Classement final :
//    le tableau d'abord, puis les niveaux.

import { calculerClassement, type CritereDepartage, type MatchTermine } from "../classement";
import { DEPARTAGE_PAR_DEFAUT } from "../formatMatch";
import { DEFINITION_POULES_TABLEAU, PHASES_POULES_TABLEAU, type DefinitionPhases, type MatchPourPhase } from "../formatPhases";
import {
  classementFinalNiveaux,
  composerNiveaux,
  estimerNiveaux,
  repartirPoulesNiveaux,
  type ClassementDePoule,
} from "../niveaux";
import { planifier, type MatchAPlanifier, type MatchPlanifie, type MatchTableauAPlanifier } from "../planification";
import type { Qualifie } from "../tableau";
import { creerRng } from "../rng";
import { tirerAuSort } from "../tirage";
import { genererTours } from "../tours";
import { operationsFinale } from "./poulesTableau";
import type {
  EtatTournoi,
  FormatAnimation,
  GroupeEtat,
  LigneClassement,
  MatchEtat,
  MatchPrevu,
  OperationsNiveaux,
  OperationsPhaseDeGroupes,
  OperationsPhaseFinale,
  PlacementEtat,
  Tour,
  Validation,
} from "./types";

// Les deux tours se jouent en « poule » : un seul réglage de format de match les couvre.
const PHASES = PHASES_POULES_TABLEAU.filter((p) => p.code === "poule");
const DEFINITION_PHASES: DefinitionPhases = {
  phases: PHASES.map((p) => ({ code: p.code, libelle: "Poules (premier et second tour)" })),
  resoudrePhases: () => (m: MatchPourPhase) => (m.phase === "poule" ? "poule" : null),
  phaseDuDepartage: "poule",
};

const operationsGroupes: OperationsPhaseDeGroupes = {
  repartir: (effectif, options) => {
    const r = repartirPoulesNiveaux(effectif, { nombrePoulesForce: options?.nombreGroupesForce });
    return { nombrePoules: r.tailles.length, tailles: r.tailles, avertissement: r.avertissement };
  },
  tirer: (participants, tailles, graine) => tirerAuSort(participants, tailles, creerRng(graine)),
  toursDuGroupe: genererTours,
  planifier,
  classerGroupe: calculerClassement,
};

const operationsNiveaux: OperationsNiveaux = {
  repartir: (effectif, options) => repartirPoulesNiveaux(effectif, { nombrePoulesForce: options?.nombreGroupesForce }),
  composer: composerNiveaux,
  classementFinal: classementFinalNiveaux,
  estimer: estimerNiveaux,
};

function placement(p: MatchPlanifie): PlacementEtat {
  return { terrainId: p.courtId, debut: p.debut, fin: p.fin };
}

function composer(etat: EtatTournoi): GroupeEtat[] {
  if (etat.groupes && etat.groupes.length > 0) return etat.groupes;
  const repartition = operationsGroupes.repartir(etat.participants.length, {
    nombreGroupesForce: etat.config.nombreGroupesForce,
  });
  const tirage = operationsGroupes.tirer(etat.participants, repartition.tailles, etat.graine);
  return tirage.poules.map((p) => ({ id: `poule-${p.nom}`, nom: p.nom, participantIds: p.equipeIds }));
}

const matchsDeGroupe = (etat: EtatTournoi): MatchEtat[] => etat.matchs.filter((m) => m.phase === "groupe");

function resultatsDuGroupe(etat: EtatTournoi, groupeId: string): MatchTermine[] {
  return matchsDeGroupe(etat)
    .filter((m) => m.groupeId === groupeId && m.termine && m.resultat)
    .map((m) => m.resultat!);
}

function classements(etat: EtatTournoi, groupes: GroupeEtat[]): ClassementDePoule[] {
  const criteres: CritereDepartage[] = etat.config.criteres ?? DEPARTAGE_PAR_DEFAUT;
  return groupes.map((g) => ({
    groupId: g.id,
    equipes: operationsGroupes.classerGroupe(resultatsDuGroupe(etat, g.id), g.participantIds, criteres),
  }));
}

/** Rencontres de chaque groupe, tour par tour, puis placement glouton sur les terrains. */
function matchsDesGroupes(
  etat: EtatTournoi,
  groupes: { id: string; participantIds: string[] }[],
  decalageTour: number,
  heureDebut: string | null,
  placer = true,
): { matchs: MatchPrevu[]; exempts: Map<number, Tour["exempts"]> } {
  const prevus: MatchPrevu[] = [];
  const exempts = new Map<number, Tour["exempts"]>();
  for (const g of groupes) {
    for (const t of operationsGroupes.toursDuGroupe(g.participantIds)) {
      t.rencontres.forEach(([a, b], j) => {
        prevus.push({
          id: `${g.id}-t${t.numero}-m${j + 1}`,
          phase: "groupe",
          groupeId: g.id,
          tour: decalageTour + t.numero,
          teamAId: a,
          teamBId: b,
        });
      });
      if (t.exempt) {
        const tour = decalageTour + t.numero;
        exempts.set(tour, [...(exempts.get(tour) ?? []), { groupeId: g.id, participantId: t.exempt }]);
      }
    }
  }

  if (placer && etat.planification && etat.terrains.length > 0 && prevus.length > 0) {
    const aPlanifier: MatchAPlanifier[] = prevus.map((m) => ({
      id: m.id,
      groupId: m.groupeId,
      round: m.tour - decalageTour,
      teamAId: m.teamAId!,
      teamBId: m.teamBId!,
    }));
    const options = heureDebut ? { ...etat.planification, heureDebut } : etat.planification;
    const plan = new Map(operationsGroupes.planifier(aPlanifier, etat.terrains, options).map((p) => [p.matchId, p]));
    for (const m of prevus) m.placement = placement(plan.get(m.id)!);
  }
  return { matchs: prevus, exempts };
}

function enTours(matchs: MatchPrevu[], exempts: Map<number, Tour["exempts"]>): Tour[] {
  const numeros = [...new Set(matchs.map((m) => m.tour))].sort((a, b) => a - b);
  return numeros.map((numero) => ({ numero, matchs: matchs.filter((m) => m.tour === numero), exempts: exempts.get(numero) ?? [] }));
}

/** Phase finale de la variante : celle du tableau classique, sans match entre les 3es de poule (les niveaux s'en chargent). */
const phaseFinaleDesNiveaux: OperationsPhaseFinale = { ...operationsFinale, matchDeClassementDesNonQualifies: () => null };

function placementsDesMatchsFinaux(etat: EtatTournoi, matchsPremier: MatchEtat[]) {
  return matchsPremier
    .filter((m) => m.placement)
    .map((m) => ({ courtId: m.placement!.terrainId, debut: m.placement!.debut, fin: m.placement!.fin, teamAId: m.teamAId, teamBId: m.teamBId }));
}

/**
 * Variante avec phase finale : tableau pour les qualifiés, niveaux de classement pour les autres (les
 * équipes de même rang de poule parmi les non-qualifiés). Tableau et niveaux sont placés ensemble, à la
 * suite du premier tour : les matchs de niveau se jouent en même temps que les tours du tableau.
 */
function secondTourAvecPhaseFinale(etat: EtatTournoi): Tour | null {
  const groupes = etat.groupes ?? [];
  const premierTour = groupes.filter((g) => !g.niveau);
  if (premierTour.length < 2) return null; // poule unique : pas de second tour
  if (groupes.some((g) => g.niveau)) return null; // niveaux déjà générés
  if (etat.matchs.some((m) => m.phase !== "groupe")) return null; // tableau déjà généré
  const matchsPremier = matchsDeGroupe(etat);
  if (matchsPremier.length === 0 || matchsPremier.some((m) => !m.termine)) return null;
  if (!etat.config.nbQualifies) return null;

  const cl = classements(etat, premierTour);
  const qualification = phaseFinaleDesNiveaux.qualifier(cl, etat.config.nbQualifies);
  if (qualification.qualifies.length !== qualification.tailleTableau) return null;

  const groupeDe = (id: string) => premierTour.find((g) => g.participantIds.includes(id))!.id;
  const qualifies: Qualifie[] = qualification.qualifies.map((teamId) => ({ teamId, groupId: groupeDe(teamId) }));
  const bracket = phaseFinaleDesNiveaux.construireTableau(qualifies);

  const niveaux = operationsNiveaux.composer(cl, new Set(qualification.qualifies)).filter((n) => n.joue);
  const nouveauxGroupes: GroupeEtat[] = niveaux.map((n) => ({
    id: `niveau-${n.niveau}`,
    nom: `Niveau ${n.niveau}`,
    participantIds: n.equipeIds,
    niveau: n.niveau,
  }));
  const dernierTour = Math.max(...matchsPremier.map((m) => m.tour));
  const { matchs: matchsNiveaux, exempts } = matchsDesGroupes(etat, nouveauxGroupes, dernierTour, null, false);

  const prevus: MatchPrevu[] = bracket.map((m) => ({
    id: m.id,
    phase: m.phase === "tableau" ? "finale" : "classement",
    groupeId: null,
    tour: m.round,
    teamAId: m.teamAId,
    teamBId: m.teamBId,
    bracketSlot: m.bracketSlot,
    nextMatchId: m.nextMatchId,
    nextSlot: m.nextSlot,
    loserNextMatchId: m.loserNextMatchId,
    loserNextSlot: m.loserNextSlot,
  }));

  if (etat.planification && etat.terrains.length > 0) {
    // Un tour de niveau tombe en même temps que le tour du tableau de même numéro (le tableau est prioritaire).
    const aPlanifier: MatchTableauAPlanifier[] = [
      ...prevus.map((m) => ({
        id: m.id,
        phase: m.phase === "finale" ? ("tableau" as const) : ("classement" as const),
        round: m.tour,
        bracketSlot: m.bracketSlot ?? null,
        teamAId: m.teamAId,
        teamBId: m.teamBId,
      })),
      ...matchsNiveaux.map((m) => ({
        id: m.id,
        phase: "classement_5e" as const,
        round: m.tour - dernierTour,
        bracketSlot: null,
        teamAId: m.teamAId,
        teamBId: m.teamBId,
      })),
    ];
    const plan = new Map(
      phaseFinaleDesNiveaux
        .planifierTableau(aPlanifier, etat.terrains, etat.planification, placementsDesMatchsFinaux(etat, matchsPremier))
        .map((p) => [p.matchId, p]),
    );
    for (const m of [...prevus, ...matchsNiveaux]) m.placement = placement(plan.get(m.id)!);
  }

  return { numero: dernierTour + 1, matchs: [...prevus, ...matchsNiveaux], exempts: [...exempts.values()].flat(), groupes: nouveauxGroupes };
}

function creerFormat(avecPhaseFinale: boolean): FormatAnimation {
  const definition = avecPhaseFinale ? DEFINITION_POULES_TABLEAU : DEFINITION_PHASES;
  return {
    code: avecPhaseFinale ? "poules_niveaux_finale" : "poules_niveaux",
    nom: avecPhaseFinale ? "Poules de niveau + phase finale" : "Poules de niveau",
    description: avecPhaseFinale
      ? "Binômes fixes en poules (autant que possible, 3 équipes minimum), puis un tableau (demi-finales, finale, 3e place) pour les meilleures équipes pendant que les autres se classent dans des niveaux. Tout le monde joue au moins 3 matchs et le classement va de la 1re à la dernière place."
      : "Binômes fixes en poules (autant que possible, 3 équipes minimum), puis un second tour où les équipes de même rang se retrouvent : les premiers de poule ensemble, puis les deuxièmes, etc. Tout le monde joue au moins 3 matchs et le classement de la 1re à la dernière place est joué, sans tableau.",

    uniteClassement: "equipe",
    calendrier: "dynamique",
    partenaire: "fixe",
    modeScore: "jeux_sets",
    aUnTableauFinal: avecPhaseFinale,

    phases: definition.phases,
    resoudrePhases: definition.resoudrePhases,
    phaseDuDepartage: definition.phaseDuDepartage,

    validerEffectif(n: number): Validation {
      try {
        const r = operationsNiveaux.repartir(n);
        return r.avertissement ? { ok: true, avertissement: r.avertissement } : { ok: true };
      } catch (e) {
        return { ok: false, message: e instanceof Error ? e.message : "Effectif impossible." };
      }
    },

    /** Premier tour : composition des poules (tirage si besoin), tours de chaque poule, placement. */
    genererTours(etat: EtatTournoi): Tour[] {
      const groupes = composer(etat).filter((g) => !g.niveau);
      const { matchs, exempts } = matchsDesGroupes(etat, groupes, 0, null);
      return enTours(matchs, exempts);
    },

    /**
     * Second tour, une fois tous les matchs du premier tour joués. Sans phase finale : un groupe par niveau
     * (les 1ers de poule, puis les 2es…), à la suite du premier tour avec au moins le repos du tournoi. Avec
     * phase finale : le tableau des qualifiés et les niveaux des autres. Un niveau de 2 équipes est un match
     * de classement, un niveau d'une équipe ne joue pas.
     */
    tourSuivant(etat: EtatTournoi): Tour | null {
      if (avecPhaseFinale) return secondTourAvecPhaseFinale(etat);

      const groupes = etat.groupes ?? [];
      const premierTour = groupes.filter((g) => !g.niveau);
      if (premierTour.length < 2) return null; // poule unique : pas de second tour
      if (groupes.some((g) => g.niveau)) return null; // second tour déjà généré
      const matchsPremier = matchsDeGroupe(etat);
      if (matchsPremier.length === 0 || matchsPremier.some((m) => !m.termine)) return null;

      const niveaux = operationsNiveaux.composer(classements(etat, premierTour)).filter((n) => n.joue);
      const dernierTour = Math.max(...matchsPremier.map((m) => m.tour));
      const nouveauxGroupes: GroupeEtat[] = niveaux.map((n) => ({
        id: `niveau-${n.niveau}`,
        nom: `Niveau ${n.niveau}`,
        participantIds: n.equipeIds,
        niveau: n.niveau,
      }));

      // Le second tour démarre après le dernier match du premier, rotation et repos compris.
      let heureDebut: string | null = null;
      const fins = matchsPremier.flatMap((m) => (m.placement ? [new Date(m.placement.fin).getTime()] : []));
      if (etat.planification && fins.length > 0) {
        const { rotationMin, reposMinMin } = etat.planification;
        heureDebut = new Date(Math.max(...fins) + Math.max(rotationMin, reposMinMin) * 60_000).toISOString();
      }

      const { matchs, exempts } = matchsDesGroupes(etat, nouveauxGroupes, dernierTour, heureDebut);
      return { numero: dernierTour + 1, matchs, exempts: [...exempts.values()].flat(), groupes: nouveauxGroupes };
    },

    /** Classement de chaque groupe (poules du premier tour et niveaux) ; le classement final passe par `niveaux.classementFinal`. */
    classement(etat: EtatTournoi): LigneClassement[] {
      return classements(etat, etat.groupes ?? []).flatMap((c) =>
        c.equipes.map((e) => ({
          rang: e.rang,
          participantId: e.teamId,
          groupeId: c.groupId,
          joues: e.joues,
          victoires: e.v,
          defaites: e.d,
          detail: e,
        })),
      );
    },

    /** Poule unique : tous ses matchs joués. Sinon : tous les matchs des niveaux joués (et le tableau, avec phase finale). */
    estTermine(etat: EtatTournoi): boolean {
      const groupes = etat.groupes ?? [];
      const matchs = matchsDeGroupe(etat);
      if (matchs.length === 0) return false;
      if (groupes.filter((g) => !g.niveau).length === 1) return matchs.every((m) => m.termine);
      const idsNiveaux = new Set(groupes.filter((g) => g.niveau).map((g) => g.id));
      const matchsNiveaux = matchs.filter((m) => m.groupeId && idsNiveaux.has(m.groupeId));
      const niveauxJoues = matchsNiveaux.every((m) => m.termine);
      if (!avecPhaseFinale) return matchsNiveaux.length > 0 && niveauxJoues;
      const tableau = etat.matchs.filter((m) => m.phase === "finale" || m.phase === "classement");
      return tableau.length > 0 && tableau.every((m) => m.termine) && niveauxJoues;
    },

    groupes: operationsGroupes,
    niveaux: operationsNiveaux,
    ...(avecPhaseFinale ? { phaseFinale: phaseFinaleDesNiveaux } : {}),
  };
}

export const poulesNiveaux: FormatAnimation = creerFormat(false);
export const poulesNiveauxFinale: FormatAnimation = creerFormat(true);
