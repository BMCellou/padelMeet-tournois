// Format « poules + tableau » (le format historique de l'application, poule unique
// comprise). Enveloppe le moteur existant SANS en réécrire la logique : chaque
// opération délègue à la fonction actuelle (répartition, tirage, tours, placement
// des matchs, classement de poule, qualification, tableau, match pour la 3e et la
// 5e place, classement final). Le comportement est strictement celui d'avant.

import { calculerClassement, type CritereDepartage, type MatchTermine } from "../classement";
import { calculerMatch5eDePoule } from "../classement5e";
import { classementFinal } from "../classementFinal";
import { DEPARTAGE_PAR_DEFAUT } from "../formatMatch";
import { impactSurQualifies } from "../impactQualifies";
import { planifier, planifierTableau, type MatchAPlanifier, type MatchPlanifie } from "../planification";
import { calculerRepartitionPoules } from "../poules";
import { selectionnerQualifies, type ClassementPoule } from "../qualification";
import { DEFINITION_POULES_TABLEAU } from "../formatPhases";
import { creerRng } from "../rng";
import { genererTableau, type Qualifie } from "../tableau";
import { alimentants, libellerTableau } from "../tableauLibelles";
import { tirerAuSort } from "../tirage";
import { genererTours } from "../tours";
import type {
  EtatTournoi,
  FormatAnimation,
  GroupeEtat,
  LigneClassement,
  MatchEtat,
  MatchPrevu,
  OperationsPhaseDeGroupes,
  OperationsPhaseFinale,
  PlacementEtat,
  Tour,
  Validation,
} from "./types";

// ── Opérations : le moteur existant, tel quel ───────────────────────────

const operationsGroupes: OperationsPhaseDeGroupes = {
  repartir: (effectif, options) => calculerRepartitionPoules(effectif, { nombrePoulesForce: options?.nombreGroupesForce }),
  tirer: (participants, tailles, graine) => tirerAuSort(participants, tailles, creerRng(graine)),
  toursDuGroupe: genererTours,
  planifier,
  classerGroupe: calculerClassement,
};

export const operationsFinale: OperationsPhaseFinale = {
  qualifier: selectionnerQualifies,
  construireTableau: genererTableau,
  planifierTableau,
  matchDeClassementDesNonQualifies: calculerMatch5eDePoule,
  classementFinal,
  impactSurQualifies,
  etiqueterTableau: libellerTableau,
  alimentants,
};

// ── Aides internes (assemblage de l'état, sans logique de tournoi) ──────

function placement(p: MatchPlanifie): PlacementEtat {
  return { terrainId: p.courtId, debut: p.debut, fin: p.fin };
}

/** Composition des groupes : celle de l'état si elle existe, sinon répartition + tirage. */
function composer(etat: EtatTournoi): GroupeEtat[] {
  if (etat.groupes && etat.groupes.length > 0) return etat.groupes;
  const repartition = operationsGroupes.repartir(etat.participants.length, {
    nombreGroupesForce: etat.config.nombreGroupesForce,
  });
  const tirage = operationsGroupes.tirer(etat.participants, repartition.tailles, etat.graine);
  return tirage.poules.map((p) => ({ id: `poule-${p.nom}`, nom: p.nom, participantIds: p.equipeIds }));
}

function resultatsDuGroupe(etat: EtatTournoi, groupeId: string): MatchTermine[] {
  return etat.matchs
    .filter((m) => m.phase === "groupe" && m.groupeId === groupeId && m.termine && m.resultat)
    .map((m) => m.resultat!);
}

function classements(etat: EtatTournoi, groupes: GroupeEtat[]): ClassementPoule[] {
  const criteres: CritereDepartage[] = etat.config.criteres ?? DEPARTAGE_PAR_DEFAUT;
  return groupes.map((g) => ({
    groupId: g.id,
    equipes: operationsGroupes.classerGroupe(resultatsDuGroupe(etat, g.id), g.participantIds, criteres),
  }));
}

function matchsDeGroupe(etat: EtatTournoi): MatchEtat[] {
  return etat.matchs.filter((m) => m.phase === "groupe");
}

// ── Le format ───────────────────────────────────────────────────────────

export const poulesTableau: FormatAnimation = {
  code: "poules_tableau",
  nom: "Poules + tableau",
  description:
    "Binômes fixes en poules (tournante complète), puis tableau à élimination directe avec match pour la 3e place. Une seule poule : le classement de poule est le classement final.",

  uniteClassement: "equipe",
  calendrier: "statique",
  partenaire: "fixe",
  modeScore: "jeux_sets",
  aUnTableauFinal: true,

  // Phases du format : poules, quarts, demies, finale, matchs de classement (clés historiques de format_par_phase).
  phases: DEFINITION_POULES_TABLEAU.phases,
  resoudrePhases: DEFINITION_POULES_TABLEAU.resoudrePhases,
  phaseDuDepartage: DEFINITION_POULES_TABLEAU.phaseDuDepartage,

  validerEffectif(n: number): Validation {
    try {
      const repartition = operationsGroupes.repartir(n);
      return repartition.avertissement ? { ok: true, avertissement: repartition.avertissement } : { ok: true };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Effectif impossible." };
    }
  },

  /** Poules : répartition + tirage (si la composition n'est pas déjà dans l'état), tours de chaque poule, placement sur les terrains. */
  genererTours(etat: EtatTournoi): Tour[] {
    const groupes = composer(etat);

    // Même ordre que le calendrier historique : poule par poule, puis tour par tour.
    const prevus: MatchPrevu[] = [];
    const exempts = new Map<number, Tour["exempts"]>();
    for (const g of groupes) {
      for (const t of operationsGroupes.toursDuGroupe(g.participantIds)) {
        t.rencontres.forEach(([a, b], j) => {
          prevus.push({
            id: `${g.id}-t${t.numero}-m${j + 1}`,
            phase: "groupe",
            groupeId: g.id,
            tour: t.numero,
            teamAId: a,
            teamBId: b,
          });
        });
        if (t.exempt) exempts.set(t.numero, [...(exempts.get(t.numero) ?? []), { groupeId: g.id, participantId: t.exempt }]);
      }
    }

    if (etat.planification && etat.terrains.length > 0) {
      const aPlanifier: MatchAPlanifier[] = prevus.map((m) => ({
        id: m.id,
        groupId: m.groupeId,
        round: m.tour,
        teamAId: m.teamAId!,
        teamBId: m.teamBId!,
      }));
      const plan = new Map(operationsGroupes.planifier(aPlanifier, etat.terrains, etat.planification).map((p) => [p.matchId, p]));
      for (const m of prevus) m.placement = placement(plan.get(m.id)!);
    }

    const numeros = [...new Set(prevus.map((m) => m.tour))].sort((a, b) => a - b);
    return numeros.map((numero) => ({
      numero,
      matchs: prevus.filter((m) => m.tour === numero),
      exempts: exempts.get(numero) ?? [],
    }));
  },

  /** Une fois tous les matchs de poule joués : qualification, tableau (+ 5e place) et leurs emplacements. */
  tourSuivant(etat: EtatTournoi): Tour | null {
    const groupes = etat.groupes;
    const matchsPoule = matchsDeGroupe(etat);
    if (!groupes || groupes.length < 2 || matchsPoule.length === 0) return null;
    if (matchsPoule.some((m) => !m.termine)) return null;
    if (etat.matchs.some((m) => m.phase !== "groupe")) return null; // tableau déjà généré
    if (!etat.config.nbQualifies) return null;

    const cl = classements(etat, groupes);
    const qualification = operationsFinale.qualifier(cl, etat.config.nbQualifies);
    if (qualification.qualifies.length !== qualification.tailleTableau) return null;

    const groupeDe = (id: string) => groupes.find((g) => g.participantIds.includes(id))!.id;
    const qualifies: Qualifie[] = qualification.qualifies.map((teamId) => ({ teamId, groupId: groupeDe(teamId) }));
    const bracket = operationsFinale.construireTableau(qualifies);

    // Match entre les deux 3es de poule non qualifiés (3 terrains au moins, comme avant).
    const rangs = cl.flatMap((c) => c.equipes.map((e) => ({ teamId: e.teamId, groupId: c.groupId, rang: e.rang })));
    const match5e =
      etat.terrains.length >= 3
        ? operationsFinale.matchDeClassementDesNonQualifies(rangs, new Set(qualification.qualifies))
        : null;

    const dernierTourBracket = Math.max(...bracket.filter((m) => m.phase === "tableau").map((m) => m.round));
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
    if (match5e) {
      prevus.push({
        id: "classement-5e",
        phase: "classement_5e",
        groupeId: null,
        tour: Math.max(1, dernierTourBracket - 1),
        teamAId: match5e.teamAId,
        teamBId: match5e.teamBId,
        bracketSlot: null,
      });
    }

    if (etat.planification && etat.terrains.length > 0) {
      const existants = matchsPoule
        .filter((m) => m.placement)
        .map((m) => ({
          courtId: m.placement!.terrainId,
          debut: m.placement!.debut,
          fin: m.placement!.fin,
          teamAId: m.teamAId,
          teamBId: m.teamBId,
        }));
      const plan = new Map(
        operationsFinale
          .planifierTableau(
            prevus.map((m) => ({
              id: m.id,
              phase: m.phase === "finale" ? ("tableau" as const) : m.phase === "classement_5e" ? ("classement_5e" as const) : ("classement" as const),
              round: m.tour,
              bracketSlot: m.bracketSlot ?? null,
              teamAId: m.teamAId,
              teamBId: m.teamBId,
            })),
            etat.terrains,
            etat.planification,
            existants,
          )
          .map((p) => [p.matchId, p]),
      );
      for (const m of prevus) m.placement = placement(plan.get(m.id)!);
    }

    return { numero: Math.max(...matchsPoule.map((m) => m.tour)) + 1, matchs: prevus, exempts: [] };
  },

  /** Classement de chaque poule (le classement final du tableau passe par `phaseFinale.classementFinal`). */
  classement(etat: EtatTournoi): LigneClassement[] {
    const groupes = etat.groupes ?? [];
    return classements(etat, groupes).flatMap((c) =>
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

  /** Une seule poule : tous ses matchs joués. Sinon : la finale du tableau est jouée. */
  estTermine(etat: EtatTournoi): boolean {
    const matchsPoule = matchsDeGroupe(etat);
    if ((etat.groupes?.length ?? 0) === 1) return matchsPoule.length > 0 && matchsPoule.every((m) => m.termine);
    const tableau = etat.matchs.filter((m) => m.phase === "finale");
    if (tableau.length === 0) return false;
    const dernierTour = Math.max(...tableau.map((m) => m.tour));
    return tableau.filter((m) => m.tour === dernierTour).every((m) => m.termine);
  },

  groupes: operationsGroupes,
  phaseFinale: operationsFinale,
};
