// Tournoi de référence pour les tests des documents PDF : 14 équipes (poules
// 5/5/4), 3 terrains, calendrier de poules + tableau de 8 planifiés, avec ou
// sans résultats joués.

import { calculerClassement, type MatchTermine } from "@/lib/engine/classement";
import { genererTours } from "@/lib/engine/tours";
import { planifier, planifierTableau } from "@/lib/engine/planification";
import { calculerRepartitionPoules } from "@/lib/engine/poules";
import { creerRng } from "@/lib/engine/rng";
import { genererTableau, type Qualifie } from "@/lib/engine/tableau";
import { tirerAuSort } from "@/lib/engine/tirage";
import { DEPARTAGE_PAR_DEFAUT } from "@/lib/engine/formatMatch";
import { FORMAT_PAR_DEFAUT } from "@/lib/engine/types";
import type { ClassementPdf, DonneesTournoi, EquipePdf, MatchPdf } from "@/lib/pdf/types";

const PRENOMS = ["Éloïse", "Noël", "Zoé", "François", "Amélie", "Hélène", "Cédric", "Inès", "Gaëlle", "Rémi", "Léa", "Maël", "Lucie", "Jérôme", "Océane", "Théo", "Chloé", "Émile", "Anaïs", "Loïc", "Camille", "Mathis", "Élodie", "Quentin", "Séverine", "Yann", "Margaux", "Baptiste"];
const NOMS = ["Dupont", "Martin", "Lefèvre", "Garcia", "Bernard", "Thomas", "Robert", "Richard", "Petit", "Durand", "Leroy", "Moreau", "Simon", "Laurent"];

const TERRAINS = [
  { id: "t1", nom: "Terrain 1" },
  { id: "t2", nom: "Terrain 2" },
  { id: "t3", nom: "Terrain 3" },
];

export function construireDonneesTournoi(options: { joue?: boolean } = {}): DonneesTournoi {
  const equipes: EquipePdf[] = Array.from({ length: 14 }, (_, i) => {
    const j1 = `${PRENOMS[2 * i]} ${NOMS[i].toUpperCase()}`;
    const j2 = `${PRENOMS[2 * i + 1]} ${NOMS[(i + 5) % 14].toUpperCase()}`;
    return { id: `e${i + 1}`, nom: `${j1} / ${j2}`, joueurs: [j1, j2] };
  });

  const repartition = calculerRepartitionPoules(14);
  const tirage = tirerAuSort(equipes.map((e) => ({ id: e.id })), repartition.tailles, creerRng(20271016));
  const poules = tirage.poules.map((p) => ({ id: `poule-${p.nom}`, nom: p.nom, equipeIds: p.equipeIds }));
  const num = (id: string | null) => Number((id ?? "e99").replace("e", ""));

  const aPlanifier = poules.flatMap((p) =>
    genererTours(p.equipeIds).flatMap((t) =>
      t.rencontres.map(([a, b], i) => ({ id: `${p.id}-t${t.numero}-${i}`, groupId: p.id, round: t.numero, teamAId: a, teamBId: b })),
    ),
  );
  const opts = { heureDebut: "2027-01-16T08:00:00.000Z", dureeJeuMin: 25, rotationMin: 5, reposMinMin: 15 };
  const courts = TERRAINS.map((t, i) => ({ id: t.id, ordre: i }));
  const plan = new Map(planifier(aPlanifier, courts, opts).map((p) => [p.matchId, p]));

  const gagne = (a: string | null, b: string | null) => (num(a) < num(b) ? a : b);
  const sets = (aGagne: boolean) => [{ jeuxA: aGagne ? 7 : 3, jeuxB: aGagne ? 3 : 7 }];
  const joue = options.joue === true;

  const matchs: MatchPdf[] = aPlanifier.map((m) => {
    const p = plan.get(m.id)!;
    const aGagne = num(m.teamAId) < num(m.teamBId);
    return {
      id: m.id, phase: "poule", groupId: m.groupId, round: m.round, bracketSlot: null,
      statut: joue ? "valide" : "a_venir", teamAId: m.teamAId, teamBId: m.teamBId,
      winnerId: joue ? gagne(m.teamAId, m.teamBId) : null,
      courtId: p.courtId, debut: p.debut, formatOverride: null,
      sets: joue ? sets(aGagne) : [], nextMatchId: null, nextSlot: null, loserNextMatchId: null, loserNextSlot: null,
    };
  });

  // Classements de poule (calculés sur les résultats simulés).
  const classements: ClassementPdf[] = [];
  const classementDePoule = new Map<string, string[]>();
  for (const p of poules) {
    const termines: MatchTermine[] = matchs
      .filter((m) => m.groupId === p.id)
      .map((m) => {
        const aGagne = num(m.teamAId) < num(m.teamBId);
        return { teamAId: m.teamAId!, teamBId: m.teamBId!, vainqueurId: gagne(m.teamAId, m.teamBId)!, setsA: aGagne ? 1 : 0, setsB: aGagne ? 0 : 1, jeuxA: aGagne ? 7 : 3, jeuxB: aGagne ? 3 : 7 };
      });
    const cl = calculerClassement(joue ? termines : [], p.equipeIds, [...DEPARTAGE_PAR_DEFAUT]);
    classementDePoule.set(p.id, cl.map((e) => e.teamId));
    for (const e of cl) {
      classements.push({ groupId: p.id, teamId: e.teamId, joues: e.joues, v: e.v, d: e.d, setsG: e.setsG, setsP: e.setsP, jeuxG: e.jeuxG, jeuxP: e.jeuxP, ratioSets: e.ratioSets, ratioJeux: e.ratioJeux, rang: joue ? e.rang : null });
    }
  }

  // Phase finale : 2 premiers de chaque poule + 2 meilleurs 3es.
  const qualifies: Qualifie[] = [
    ...poules.flatMap((p) => classementDePoule.get(p.id)!.slice(0, 2).map((teamId) => ({ teamId, groupId: p.id }))),
    ...poules.slice(0, 2).map((p) => ({ teamId: classementDePoule.get(p.id)![2], groupId: p.id })),
  ];
  const bracket = genererTableau(qualifies);
  const finPoules = Math.max(...[...plan.values()].map((p) => new Date(p.fin).getTime()));
  const planFinal = new Map(
    planifierTableau(
      bracket.map((m) => ({ id: m.id, phase: m.phase, round: m.round, bracketSlot: m.bracketSlot, teamAId: m.teamAId, teamBId: m.teamBId })),
      courts, opts,
      aPlanifier.map((m) => ({ courtId: plan.get(m.id)!.courtId, debut: plan.get(m.id)!.debut, fin: plan.get(m.id)!.fin, teamAId: m.teamAId, teamBId: m.teamBId })),
    ).map((p) => [p.matchId, p]),
  );
  void finPoules;

  const etat = new Map(bracket.map((m) => [m.id, { a: m.teamAId, b: m.teamBId, winner: null as string | null }]));
  if (joue) {
    for (let tour = 1; tour <= 3; tour++) {
      for (const m of bracket.filter((x) => x.round === tour && x.phase === "tableau")) {
        const e = etat.get(m.id)!;
        e.winner = gagne(e.a, e.b);
        const perdant = e.winner === e.a ? e.b : e.a;
        if (m.nextMatchId) etat.get(m.nextMatchId)![m.nextSlot === "a" ? "a" : "b"] = e.winner;
        if (m.loserNextMatchId) etat.get(m.loserNextMatchId)![m.loserNextSlot === "a" ? "a" : "b"] = perdant;
      }
    }
    const pf = etat.get("petite-finale")!;
    pf.winner = gagne(pf.a, pf.b);
  }

  for (const m of bracket) {
    const e = etat.get(m.id)!;
    const p = planFinal.get(m.id)!;
    matchs.push({
      id: m.id, phase: m.phase, groupId: null, round: m.round, bracketSlot: m.bracketSlot,
      statut: joue ? "valide" : "a_venir", teamAId: e.a, teamBId: e.b, winnerId: e.winner,
      courtId: p.courtId, debut: p.debut, formatOverride: null,
      sets: joue && e.a && e.b ? sets(num(e.a) < num(e.b)) : [],
      nextMatchId: m.nextMatchId, nextSlot: m.nextSlot, loserNextMatchId: m.loserNextMatchId, loserNextSlot: m.loserNextSlot,
    });
  }

  return {
    tournoi: {
      nom: "Tournoi des Étoiles d'Été", date: "2027-01-16", statut: joue ? "termine" : "publie",
      genre: "mixte", niveau: "P100-P250", nbQualifies: 8,
      formatDefaut: FORMAT_PAR_DEFAUT, formatsParPhase: {}, criteres: [...DEPARTAGE_PAR_DEFAUT], dureeMatchMin: 25,
    },
    club: { nom: "Padel Club de Bordeaux", ville: "Bordeaux" },
    terrains: TERRAINS,
    equipes, poules, matchs, classements,
  };
}
