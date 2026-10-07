// Rejeu de bout en bout d'un scénario de référence avec le seul moteur (aucune
// base, aucune horloge, aucun hasard non semé) et sérialisation déterministe de
// l'état final. Sert à figer le comportement : tests/golden/<scenario>.json.
// Ne jamais régénérer ces fichiers pour faire passer un test.

import { calculerClassement, type EquipeClassee, type MatchTermine } from "@/lib/engine/classement";
import { classementFinal, cumulJeuxGagnesTournoi } from "@/lib/engine/classementFinal";
import { planifier, planifierTableau, type MatchAPlanifier, type MatchPlanifie } from "@/lib/engine/planification";
import { calculerRepartitionPoules } from "@/lib/engine/poules";
import { selectionnerQualifies, type ClassementPoule } from "@/lib/engine/qualification";
import { creerRng } from "@/lib/engine/rng";
import { determinerVainqueurMatch, type SetSaisi } from "@/lib/engine/score";
import { genererTableau, type MatchTableau, type Qualifie } from "@/lib/engine/tableau";
import { tirerAuSort } from "@/lib/engine/tirage";
import { genererTours } from "@/lib/engine/tours";
import { FORMAT_PAR_DEFAUT } from "@/lib/engine/types";
import { calculerClassementFinalTableau, type StandingRow } from "@/lib/tournoi/classementFinalAffichage";
import { versMatchTermine } from "@/lib/tournoi/classementPoule";
import type { Scenario } from "../../tests/fixtures/scenario";

export interface MatchFige {
  id: string;
  phase: "poule" | "tableau" | "classement";
  groupId: string | null;
  round: number;
  bracketSlot: number | null;
  teamAId: string | null;
  teamBId: string | null;
  courtId: string;
  debut: string;
  fin: string;
  statut: "valide";
  winnerId: string | null;
  sets: SetSaisi[];
  nextMatchId: string | null;
  nextSlot: "a" | "b" | null;
  loserNextMatchId: string | null;
  loserNextSlot: "a" | "b" | null;
}

export type EtatGolden = Record<string, unknown>;

function sets(resultat: MatchTermine): SetSaisi[] {
  return [{ jeuxA: resultat.jeuxA, jeuxB: resultat.jeuxB }];
}

/** Saisie puis validation d'un score : le vainqueur désigné doit être celui du scénario. */
function validerScore(a: string, b: string, resultat: MatchTermine): { winnerId: string; sets: SetSaisi[]; termine: MatchTermine } {
  const saisis = sets(resultat);
  const verdict = determinerVainqueurMatch(saisis, FORMAT_PAR_DEFAUT);
  const winnerId = verdict.vainqueur === "a" ? a : verdict.vainqueur === "b" ? b : null;
  if (!winnerId || winnerId !== resultat.vainqueurId) {
    throw new Error(`Score non validable ou vainqueur inattendu pour ${a} - ${b}.`);
  }
  const termine = versMatchTermine({
    team_a_id: a,
    team_b_id: b,
    winner_id: winnerId,
    statut: "valide",
    match_sets: saisis.map((s) => ({ jeux_a: s.jeuxA, jeux_b: s.jeuxB, tiebreak_a: null, tiebreak_b: null })),
  });
  return { winnerId, sets: saisis, termine };
}

export function rejouerScenario(sc: Scenario): EtatGolden {
  const options = {
    heureDebut: sc.heureDebut,
    dureeJeuMin: sc.dureeJeuMin,
    rotationMin: sc.rotationMin,
    reposMinMin: sc.reposMinMin,
  };

  // 1. Répartition en poules et tirage (graine fixée en dur).
  const repartition = calculerRepartitionPoules(sc.equipes.length);
  const tirage = tirerAuSort(sc.equipes, repartition.tailles, creerRng(sc.graineTirage));

  // 2. Tours et calendrier des poules.
  const poules = tirage.poules.map((p) => ({ id: `poule-${p.nom}`, nom: p.nom, equipeIds: p.equipeIds, tours: genererTours(p.equipeIds) }));
  const aPlanifier: MatchAPlanifier[] = poules.flatMap((p) =>
    p.tours.flatMap((t) =>
      t.rencontres.map(([a, b], j) => ({ id: `${p.id}-t${t.numero}-m${j + 1}`, groupId: p.id, round: t.numero, teamAId: a, teamBId: b })),
    ),
  );
  const planPoules = planifier(aPlanifier, sc.terrains, options);
  const planParId = new Map<string, MatchPlanifie>(planPoules.map((p) => [p.matchId, p]));

  // 3. Saisie et validation de tous les scores de poule.
  const matchsPoule: MatchFige[] = [];
  const termines: MatchTermine[] = [];
  const terminesParPoule = new Map<string, MatchTermine[]>();
  for (const m of aPlanifier) {
    const { winnerId, sets: saisis, termine } = validerScore(m.teamAId, m.teamBId, sc.simulerMatch(m.teamAId, m.teamBId));
    const plan = planParId.get(m.id)!;
    matchsPoule.push({
      id: m.id, phase: "poule", groupId: m.groupId, round: m.round, bracketSlot: null,
      teamAId: m.teamAId, teamBId: m.teamBId, courtId: plan.courtId, debut: plan.debut, fin: plan.fin,
      statut: "valide", winnerId, sets: saisis,
      nextMatchId: null, nextSlot: null, loserNextMatchId: null, loserNextSlot: null,
    });
    termines.push(termine);
    terminesParPoule.set(m.groupId!, [...(terminesParPoule.get(m.groupId!) ?? []), termine]);
  }

  // 4. Classement de chaque poule.
  const classements: ClassementPoule[] = poules.map((p) => ({
    groupId: p.id,
    equipes: calculerClassement(terminesParPoule.get(p.id) ?? [], p.equipeIds, sc.criteres),
  }));
  const standings = new Map<string, StandingRow>();
  for (const c of classements) {
    for (const e of c.equipes) {
      standings.set(e.teamId, { team_id: e.teamId, joues: e.joues, v: e.v, ratio_sets: e.ratioSets, ratio_jeux: e.ratioJeux, rang: e.rang });
    }
  }
  const cumulJeux = cumulJeuxGagnesTournoi(termines, sc.equipes.map((e) => e.id));

  const etat: EtatGolden = {
    scenario: sc.nom,
    parametres: {
      graineTirage: sc.graineTirage, heureDebut: sc.heureDebut, terrains: sc.terrains,
      dureeJeuMin: sc.dureeJeuMin, rotationMin: sc.rotationMin, reposMinMin: sc.reposMinMin,
      criteres: sc.criteres, nbQualifies: sc.nbQualifies, nbEquipes: sc.equipes.length,
    },
    repartition,
    tirage: tirage.poules,
    poules: poules.map((p) => ({ id: p.id, nom: p.nom, equipeIds: p.equipeIds, tours: p.tours })),
    calendrierPoules: planPoules,
    matchsPoule,
    classementsPoule: classements,
    cumulJeuxGagnes: cumulJeux,
  };

  // Poule unique : pas de tableau, le classement de poule est le classement final.
  if (poules.length === 1) {
    etat.classementFinal = classements[0].equipes.map((e: EquipeClassee) => ({ rang: e.rang, teamId: e.teamId }));
    return etat;
  }

  // 5. Qualification et tableau final.
  const qualification = selectionnerQualifies(classements, sc.nbQualifies);
  const groupeDe = (teamId: string) => poules.find((p) => p.equipeIds.includes(teamId))!.id;
  const qualifies: Qualifie[] = qualification.qualifies.map((teamId) => ({ teamId, groupId: groupeDe(teamId) }));
  const bracket = genererTableau(qualifies);

  // 6. Calendrier du tableau (emplacements planifiés avant que les équipes soient connues).
  const planTableau = new Map(
    planifierTableau(
      bracket.map((m) => ({ id: m.id, phase: m.phase, round: m.round, bracketSlot: m.bracketSlot, teamAId: m.teamAId, teamBId: m.teamBId })),
      sc.terrains,
      options,
      planPoules.map((p) => {
        const m = aPlanifier.find((x) => x.id === p.matchId)!;
        return { courtId: p.courtId, debut: p.debut, fin: p.fin, teamAId: m.teamAId, teamBId: m.teamBId };
      }),
    ).map((p) => [p.matchId, p]),
  );

  // 7. Saisie et validation des matchs du tableau, tour par tour, avec propagation
  //    du vainqueur et (demi-finales) du perdant vers le match pour la 3e place.
  const etatBracket = new Map<string, MatchTableau>(bracket.map((m) => [m.id, { ...m }]));
  const matchsTableau: MatchFige[] = [];
  const nbTours = Math.log2(qualifies.length);
  for (let tour = 1; tour <= nbTours; tour++) {
    for (const m of bracket.filter((x) => x.round === tour)) {
      const courant = etatBracket.get(m.id)!;
      const a = courant.teamAId!;
      const b = courant.teamBId!;
      const { winnerId, sets: saisis, termine } = validerScore(a, b, sc.simulerMatch(a, b));
      const perdantId = winnerId === a ? b : a;
      courant.winnerId = winnerId;
      if (m.nextMatchId) etatBracket.set(m.nextMatchId, { ...etatBracket.get(m.nextMatchId)!, [m.nextSlot === "a" ? "teamAId" : "teamBId"]: winnerId });
      if (m.loserNextMatchId) etatBracket.set(m.loserNextMatchId, { ...etatBracket.get(m.loserNextMatchId)!, [m.loserNextSlot === "a" ? "teamAId" : "teamBId"]: perdantId });
      const plan = planTableau.get(m.id)!;
      matchsTableau.push({
        id: m.id, phase: m.phase, groupId: null, round: m.round, bracketSlot: m.bracketSlot,
        teamAId: a, teamBId: b, courtId: plan.courtId, debut: plan.debut, fin: plan.fin,
        statut: "valide", winnerId, sets: saisis,
        nextMatchId: m.nextMatchId, nextSlot: m.nextSlot, loserNextMatchId: m.loserNextMatchId, loserNextSlot: m.loserNextSlot,
      });
      termines.push(termine);
    }
  }

  // 8. Classement final (mêmes fonctions que l'application).
  const brut = (m: MatchFige) => ({ round: m.round, team_a_id: m.teamAId, team_b_id: m.teamBId, winner_id: m.winnerId, statut: m.statut, next_match_id: m.nextMatchId });
  const principal = matchsTableau.filter((m) => m.phase === "tableau");
  const petiteFinale = matchsTableau.find((m) => m.phase === "classement");
  const lignes = calculerClassementFinalTableau(
    principal.map(brut),
    petiteFinale ? brut(petiteFinale) : null,
    null,
    sc.equipes.map((e) => e.id),
    standings,
    new Map(sc.equipes.map((e) => [e.id, e.id])),
  );

  etat.qualification = qualification;
  etat.tableau = principal;
  etat.matchTroisiemePlace = petiteFinale ?? null;
  etat.classementFinal = lignes;
  etat.cumulJeuxGagnes = cumulJeuxGagnesTournoi(termines, sc.equipes.map((e) => e.id));
  // classementFinal (moteur brut), pour couvrir la fonction pure en plus de l'affichage.
  const final = principal.find((m) => m.round === nbTours)!;
  etat.classementFinalMoteur = classementFinal({
    finaleVainqueurId: final.winnerId!,
    finalePerdantId: final.winnerId === final.teamAId ? final.teamBId! : final.teamAId!,
    demiFinalesPerdantIds: principal.filter((m) => m.round === nbTours - 1).map((m) => (m.winnerId === m.teamAId ? m.teamBId! : m.teamAId!)),
    petiteFinale: petiteFinale
      ? { vainqueurId: petiteFinale.winnerId!, perdantId: petiteFinale.winnerId === petiteFinale.teamAId ? petiteFinale.teamBId! : petiteFinale.teamAId! }
      : null,
    quartsPerdantIdsTries: [],
    nonQualifieIdsTries: [],
  });
  return etat;
}

// ── Sérialisation déterministe ──────────────────────────────────────────

/**
 * Ordre des clés racine : celui du pipeline, de la cause vers la conséquence,
 * pour que le premier écart signalé soit le plus proche de la cause. Les clés
 * imbriquées restent triées alphabétiquement (déterminisme).
 */
export const ORDRE_RACINE = [
  "scenario",
  "parametres",
  "repartition",
  "tirage",
  "poules",
  "calendrierPoules",
  "matchsPoule",
  "classementsPoule",
  "qualification",
  "tableau",
  "matchTroisiemePlace",
  "classementFinal",
  "classementFinalMoteur",
  "cumulJeuxGagnes",
] as const;

function ordonnerRacine(etat: EtatGolden): EtatGolden {
  const connues = new Set<string>(ORDRE_RACINE);
  const ordonne: EtatGolden = {};
  for (const cle of ORDRE_RACINE) if (cle in etat) ordonne[cle] = etat[cle];
  for (const cle of Object.keys(etat).sort()) if (!connues.has(cle)) ordonne[cle] = etat[cle];
  return ordonne;
}

function trierCles(valeur: unknown, chemin = "$"): unknown {
  if (typeof valeur === "number" && !Number.isFinite(valeur)) {
    throw new Error(`Valeur non finie (${valeur}) en ${chemin} : un ratio ne doit jamais être Infinity ni NaN.`);
  }
  if (Array.isArray(valeur)) return valeur.map((v, i) => trierCles(v, `${chemin}[${i}]`));
  if (valeur && typeof valeur === "object") {
    return Object.fromEntries(
      Object.entries(valeur as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => [k, trierCles(v, `${chemin}.${k}`)]),
    );
  }
  return valeur;
}

/** JSON à clés triées, indenté, terminé par un retour à la ligne : identique d'une exécution à l'autre. */
export function serialiser(etat: EtatGolden): string {
  const trie = trierCles(etat) as EtatGolden;
  return `${JSON.stringify(ordonnerRacine(trie), null, 2)}\n`;
}

/** Premier écart entre deux valeurs JSON, avec son chemin ; null si identiques. */
export function premierEcart(attendu: unknown, obtenu: unknown, chemin = "$"): string | null {
  if (Array.isArray(attendu) && Array.isArray(obtenu)) {
    const n = Math.max(attendu.length, obtenu.length);
    for (let i = 0; i < n; i++) {
      if (i >= attendu.length) return `${chemin}[${i}] : élément en trop (obtenu ${JSON.stringify(obtenu[i])})`;
      if (i >= obtenu.length) return `${chemin}[${i}] : élément manquant (attendu ${JSON.stringify(attendu[i])})`;
      const e = premierEcart(attendu[i], obtenu[i], `${chemin}[${i}]`);
      if (e) return e;
    }
    return null;
  }
  if (attendu && obtenu && typeof attendu === "object" && typeof obtenu === "object" && !Array.isArray(attendu) && !Array.isArray(obtenu)) {
    const a = attendu as Record<string, unknown>;
    const o = obtenu as Record<string, unknown>;
    // Ordre du fichier figé (celui du pipeline), puis les clés en trop.
    for (const cle of [...new Set([...Object.keys(a), ...Object.keys(o)])]) {
      if (!(cle in a)) return `${chemin}.${cle} : clé en trop (obtenu ${JSON.stringify(o[cle])})`;
      if (!(cle in o)) return `${chemin}.${cle} : clé manquante (attendu ${JSON.stringify(a[cle])})`;
      const e = premierEcart(a[cle], o[cle], `${chemin}.${cle}`);
      if (e) return e;
    }
    return null;
  }
  return JSON.stringify(attendu) === JSON.stringify(obtenu)
    ? null
    : `${chemin} : attendu ${JSON.stringify(attendu)}, obtenu ${JSON.stringify(obtenu)}`;
}
