// Scénario de référence : 14 équipes (poules 5/5/4, tableau de 8) planifiées
// de bout en bout sur 3 terrains — poules puis phase finale. Aucun conflit,
// aucun match avant celui qui l'alimente, repos minimum respecté entre un
// quart et la demie correspondante.

import { describe, expect, it } from "vitest";
import { calculerRepartitionPoules } from "@/lib/engine/poules";
import { tirerAuSort } from "@/lib/engine/tirage";
import { genererTours } from "@/lib/engine/tours";
import { creerRng } from "@/lib/engine/rng";
import { genererTableau, type Qualifie } from "@/lib/engine/tableau";
import {
  planifier,
  planifierTableau,
  type MatchAPlanifier,
  type MatchTableauAPlanifier,
} from "@/lib/engine/planification";
import { detecterConflits, type MatchPlanifieAvecEquipes } from "@/lib/engine/conflits";
import { alimentants, type MatchTableauStructure } from "@/lib/engine/tableauLibelles";

const OPTIONS = {
  heureDebut: "2026-10-10T08:00:00.000Z",
  dureeJeuMin: 25,
  rotationMin: 5,
  reposMinMin: 15,
};
const COURTS = [
  { id: "t1", ordre: 1 },
  { id: "t2", ordre: 2 },
  { id: "t3", ordre: 3 },
];
const ms = (iso: string) => new Date(iso).getTime();
const minutes = (n: number) => n * 60_000;

describe("14 équipes planifiées de bout en bout sur 3 terrains", () => {
  const equipes = Array.from({ length: 14 }, (_, i) => ({ id: `equipe${i + 1}` }));
  const repartition = calculerRepartitionPoules(14);
  const tirage = tirerAuSort(equipes, repartition.tailles, creerRng(20261010));

  // Poules : round-robin complet, planifié.
  const matchsPoule: MatchAPlanifier[] = tirage.poules.flatMap((poule) =>
    genererTours(poule.equipeIds).flatMap((tour) =>
      tour.rencontres.map(([a, b], i) => ({
        id: `p-${poule.nom}-${tour.numero}-${i}`,
        groupId: poule.nom,
        round: tour.numero,
        teamAId: a,
        teamBId: b,
      })),
    ),
  );
  const planPoules = planifier(matchsPoule, COURTS, OPTIONS);

  // Phase finale : 2 premiers de chaque poule + 2 meilleurs 3es.
  const qualifies: Qualifie[] = [
    ...tirage.poules.flatMap((p) => p.equipeIds.slice(0, 2).map((teamId) => ({ teamId, groupId: p.nom }))),
    ...tirage.poules.slice(0, 2).map((p) => ({ teamId: p.equipeIds[2], groupId: p.nom })),
  ];
  const tableau = genererTableau(qualifies);

  const existants = planPoules.map((pl) => {
    const m = matchsPoule.find((x) => x.id === pl.matchId)!;
    return { courtId: pl.courtId, debut: pl.debut, fin: pl.fin, teamAId: m.teamAId, teamBId: m.teamBId };
  });

  const aPlanifier: MatchTableauAPlanifier[] = tableau.map((m) => ({
    id: m.id,
    phase: m.phase,
    round: m.round,
    bracketSlot: m.bracketSlot,
    teamAId: m.teamAId,
    teamBId: m.teamBId,
  }));
  const planTableau = planifierTableau(aPlanifier, COURTS, OPTIONS, existants);
  const planParId = new Map(planTableau.map((p) => [p.matchId, p]));

  const structure: MatchTableauStructure[] = tableau.map((m) => ({
    id: m.id,
    phase: m.phase,
    round: m.round,
    bracketSlot: m.bracketSlot,
    nextMatchId: m.nextMatchId,
    nextSlot: m.nextSlot,
    loserNextMatchId: m.loserNextMatchId,
    loserNextSlot: m.loserNextSlot,
  }));
  const alimentantsParMatch = alimentants(structure);

  const tousLesMatchs: MatchPlanifieAvecEquipes[] = [
    ...planPoules.map((pl) => {
      const m = matchsPoule.find((x) => x.id === pl.matchId)!;
      return { matchId: pl.matchId, courtId: pl.courtId, teamAId: m.teamAId, teamBId: m.teamBId, debut: pl.debut, fin: pl.fin };
    }),
    ...tableau.map((m) => {
      const pl = planParId.get(m.id)!;
      return {
        matchId: m.id,
        courtId: pl.courtId,
        teamAId: m.teamAId,
        teamBId: m.teamBId,
        debut: pl.debut,
        fin: pl.fin,
        alimentePar: alimentantsParMatch.get(m.id),
      };
    }),
  ];

  it("planifie chaque match du tableau exactement une fois (quarts, demies, finale, 3e place)", () => {
    expect(tableau).toHaveLength(8);
    expect(planTableau).toHaveLength(8);
    expect(new Set(planTableau.map((p) => p.matchId)).size).toBe(8);
  });

  it("ne produit aucun conflit sur l'ensemble poules + phase finale", () => {
    expect(detecterConflits(tousLesMatchs, OPTIONS.reposMinMin)).toEqual([]);
  });

  it("place la phase finale après le dernier match de poule", () => {
    const finPoules = Math.max(...planPoules.map((p) => ms(p.fin)));
    for (const p of planTableau) expect(ms(p.debut)).toBeGreaterThanOrEqual(finPoules);
  });

  it("ne place aucun match avant celui qui l'alimente", () => {
    for (const m of tableau) {
      for (const idAlimentant of alimentantsParMatch.get(m.id) ?? []) {
        expect(ms(planParId.get(m.id)!.debut)).toBeGreaterThanOrEqual(ms(planParId.get(idAlimentant)!.fin));
      }
    }
  });

  it("respecte le repos minimum entre un quart et la demie correspondante", () => {
    const quarts = tableau.filter((m) => m.round === 1);
    expect(quarts).toHaveLength(4);
    for (const q of quarts) {
      const demie = planParId.get(q.nextMatchId!)!;
      expect(ms(demie.debut) - ms(planParId.get(q.id)!.fin)).toBeGreaterThanOrEqual(minutes(OPTIONS.reposMinMin));
    }
  });

  it("joue tous les quarts avant toutes les demies, et toutes les demies avant la finale", () => {
    const debutDe = (round: number) => tableau.filter((m) => m.round === round && m.phase === "tableau").map((m) => ms(planParId.get(m.id)!.debut));
    const finDe = (round: number) => tableau.filter((m) => m.round === round && m.phase === "tableau").map((m) => ms(planParId.get(m.id)!.fin));
    expect(Math.min(...debutDe(2))).toBeGreaterThanOrEqual(Math.max(...finDe(1)));
    expect(Math.min(...debutDe(3))).toBeGreaterThanOrEqual(Math.max(...finDe(2)));
  });

  it("place le match pour la 3e place après les deux demies, avec la finale si un terrain est libre", () => {
    const petite = planParId.get("petite-finale")!;
    const finale = planParId.get("t3-m1")!;
    for (const d of tableau.filter((m) => m.round === 2 && m.phase === "tableau")) {
      expect(ms(petite.debut)).toBeGreaterThanOrEqual(ms(planParId.get(d.id)!.fin));
    }
    expect(petite.debut).toBe(finale.debut);
    expect(petite.courtId).not.toBe(finale.courtId);
  });

  it("n'ouvre pas un créneau plus tard si un terrain était libre et ses équipes disponibles plus tôt", () => {
    const creneauMs = minutes(OPTIONS.dureeJeuMin + OPTIONS.rotationMin);
    const quarts = tableau.filter((m) => m.round === 1);
    const premierCreneau = Math.min(...quarts.map((q) => ms(planParId.get(q.id)!.debut)));
    for (const q of quarts) {
      const debut = ms(planParId.get(q.id)!.debut);
      if (debut === premierCreneau) continue;
      const candidat = debut - creneauMs;
      const fin = candidat + minutes(OPTIONS.dureeJeuMin);
      const autres = tousLesMatchs.filter((m) => m.matchId !== q.id);
      const terrainsOccupes = new Set(
        autres.filter((m) => ms(m.debut) < fin && candidat < ms(m.fin)).map((m) => m.courtId),
      );
      const equipeBloquee = [q.teamAId, q.teamBId].some((t) =>
        autres.some(
          (m) =>
            (m.teamAId === t || m.teamBId === t) &&
            ms(m.fin) <= debut &&
            candidat - ms(m.fin) < minutes(OPTIONS.reposMinMin),
        ),
      );
      expect(terrainsOccupes.size === COURTS.length || equipeBloquee).toBe(true);
    }
  });

  it("n'utilise jamais plus de 3 terrains en même temps", () => {
    for (const a of tousLesMatchs) {
      const simultanes = tousLesMatchs.filter((b) => ms(b.debut) < ms(a.fin) && ms(a.debut) < ms(b.fin));
      expect(new Set(simultanes.map((m) => m.courtId)).size).toBeLessThanOrEqual(COURTS.length);
    }
  });
});
