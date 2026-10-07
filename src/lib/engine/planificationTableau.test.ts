import { describe, expect, it } from "vitest";
import { planifierTableau, type MatchTableauAPlanifier, type PlanificationOptions } from "./planification";
import { detecterConflits, type MatchPlanifieAvecEquipes } from "./conflits";
import { alimentants, libellerTableau, type MatchTableauStructure } from "./tableauLibelles";

const courts = [
  { id: "c1", ordre: 1 },
  { id: "c2", ordre: 2 },
  { id: "c3", ordre: 3 },
];
const options: PlanificationOptions = {
  heureDebut: "2026-10-10T08:00:00.000Z",
  dureeJeuMin: 25,
  rotationMin: 5,
  reposMinMin: 15,
};
const min = (iso: string) => new Date(iso).getTime() / 60_000;

// Tableau de 4 (2 poules de 4) : 2 demis, finale, 3e place, 5e place.
const tableau4: MatchTableauAPlanifier[] = [
  { id: "d1", phase: "tableau", round: 1, bracketSlot: 0, teamAId: "A1", teamBId: "B2" },
  { id: "d2", phase: "tableau", round: 1, bracketSlot: 1, teamAId: "B1", teamBId: "A2" },
  { id: "f", phase: "tableau", round: 2, bracketSlot: 0, teamAId: null, teamBId: null },
  { id: "p3", phase: "classement", round: 2, bracketSlot: -1, teamAId: null, teamBId: null },
  { id: "p5", phase: "classement_5e", round: 1, bracketSlot: null, teamAId: "A3", teamBId: "B3" },
];

describe("planifierTableau", () => {
  it("place le match de 5e place en parallèle des demies et celui de 3e place avec la finale", () => {
    const plan = new Map(planifierTableau(tableau4, courts, options).map((p) => [p.matchId, p]));
    expect(plan.get("p5")!.debut).toBe(plan.get("d1")!.debut);
    expect(new Set([plan.get("d1")!.courtId, plan.get("d2")!.courtId, plan.get("p5")!.courtId]).size).toBe(3);
    expect(plan.get("p3")!.debut).toBe(plan.get("f")!.debut);
    expect(plan.get("p3")!.courtId).not.toBe(plan.get("f")!.courtId);
  });

  it("n'avance la finale qu'après la fin des demies + repos minimum", () => {
    const plan = new Map(planifierTableau(tableau4, courts, options).map((p) => [p.matchId, p]));
    const ecart = min(plan.get("f")!.debut) - min(plan.get("d1")!.fin);
    expect(ecart).toBeGreaterThanOrEqual(options.reposMinMin);
  });

  it("avec un seul terrain, tout est séquentiel : jamais deux matchs en même temps", () => {
    const plan = planifierTableau(tableau4, [courts[0]], options);
    const debuts = plan.map((p) => p.debut);
    expect(new Set(debuts).size).toBe(plan.length);
  });

  it("démarre après la fin des matchs existants (poules) et respecte le repos des équipes connues", () => {
    const existants = [
      { courtId: "c1", debut: "2026-10-10T08:00:00.000Z", fin: "2026-10-10T08:25:00.000Z", teamAId: "A1", teamBId: "A3" },
    ];
    const plan = new Map(planifierTableau(tableau4, courts, options, existants).map((p) => [p.matchId, p]));
    // Fin de poule 08:25, +5 min de rotation = 08:30 ; A1 a besoin de 15 min de repos → 08:40 au plus tôt.
    expect(min(plan.get("d1")!.debut)).toBeGreaterThanOrEqual(min("2026-10-10T08:25:00.000Z") + 15);
    expect(min(plan.get("p5")!.debut)).toBeGreaterThanOrEqual(min("2026-10-10T08:25:00.000Z") + 15);
  });

  it("une finale seule (tableau de 2) est planifiée sans match de 3e place", () => {
    const plan = planifierTableau(
      [{ id: "f", phase: "tableau", round: 1, bracketSlot: 0, teamAId: "A", teamBId: "B" }],
      courts,
      options,
    );
    expect(plan).toHaveLength(1);
  });

  it("refuse de planifier sans terrain", () => {
    expect(() => planifierTableau(tableau4, [], options)).toThrow();
  });
});

describe("conflit « placé avant le match qui l'alimente »", () => {
  const base = (m: Partial<MatchPlanifieAvecEquipes> & { matchId: string }): MatchPlanifieAvecEquipes => ({
    courtId: "c1",
    teamAId: null,
    teamBId: null,
    debut: "2026-10-10T08:00:00.000Z",
    fin: "2026-10-10T08:25:00.000Z",
    ...m,
  });

  it("signale une demie placée avant la fin d'un quart qui l'alimente", () => {
    const conflits = detecterConflits(
      [
        base({ matchId: "q1", courtId: "c1", debut: "2026-10-10T09:00:00.000Z", fin: "2026-10-10T09:25:00.000Z" }),
        base({ matchId: "d1", courtId: "c2", debut: "2026-10-10T08:00:00.000Z", fin: "2026-10-10T08:25:00.000Z", alimentePar: ["q1"] }),
      ],
      15,
    );
    expect(conflits).toEqual([{ type: "avant_match_alimentant", matchIds: ["d1", "q1"] }]);
  });

  it("signale un repos insuffisant entre un quart et sa demie, même sans équipes connues", () => {
    const conflits = detecterConflits(
      [
        base({ matchId: "q1", debut: "2026-10-10T08:00:00.000Z", fin: "2026-10-10T08:25:00.000Z" }),
        base({ matchId: "d1", courtId: "c2", debut: "2026-10-10T08:30:00.000Z", fin: "2026-10-10T08:55:00.000Z", alimentePar: ["q1"] }),
      ],
      15,
    );
    expect(conflits.map((c) => c.type)).toEqual(["repos_insuffisant"]);
  });

  it("n'invente pas de conflit entre deux matchs aux équipes inconnues", () => {
    const conflits = detecterConflits(
      [
        base({ matchId: "x", courtId: "c1", debut: "2026-10-10T08:00:00.000Z", fin: "2026-10-10T08:25:00.000Z" }),
        base({ matchId: "y", courtId: "c2", debut: "2026-10-10T08:00:00.000Z", fin: "2026-10-10T08:25:00.000Z" }),
      ],
      15,
    );
    expect(conflits).toEqual([]);
  });
});

describe("libellerTableau", () => {
  const structure: MatchTableauStructure[] = [
    { id: "q1", phase: "tableau", round: 1, bracketSlot: 0, nextMatchId: "d1", nextSlot: "a", loserNextMatchId: null, loserNextSlot: null },
    { id: "q2", phase: "tableau", round: 1, bracketSlot: 1, nextMatchId: "d1", nextSlot: "b", loserNextMatchId: null, loserNextSlot: null },
    { id: "d1", phase: "tableau", round: 2, bracketSlot: 0, nextMatchId: "f", nextSlot: "a", loserNextMatchId: "p3", loserNextSlot: "a" },
    { id: "d2", phase: "tableau", round: 2, bracketSlot: 1, nextMatchId: "f", nextSlot: "b", loserNextMatchId: "p3", loserNextSlot: "b" },
    { id: "f", phase: "tableau", round: 3, bracketSlot: 0, nextMatchId: null, nextSlot: null, loserNextMatchId: null, loserNextSlot: null },
    { id: "p3", phase: "classement", round: 3, bracketSlot: -1, nextMatchId: null, nextSlot: null, loserNextMatchId: null, loserNextSlot: null },
  ];

  it("nomme chaque match et ses sources", () => {
    const l = libellerTableau(structure);
    expect(l.get("q1")!.etiquette).toBe("Quart de finale n°1");
    expect(l.get("d1")!.etiquette).toBe("Demi-finale n°1");
    expect(l.get("f")!.etiquette).toBe("Finale");
    expect(l.get("d1")!.sourceA).toBe("Vainqueur du quart n°1");
    expect(l.get("d1")!.sourceB).toBe("Vainqueur du quart n°2");
    expect(l.get("f")!.sourceA).toBe("Vainqueur de la demi n°1");
    expect(l.get("p3")!.etiquette).toBe("Match pour la 3e place");
    expect(l.get("p3")!.sourceA).toBe("Perdant de la demi n°1");
    expect(l.get("p3")!.sourceB).toBe("Perdant de la demi n°2");
    expect(l.get("q1")!.sourceA).toBeNull();
  });

  it("liste les matchs qui alimentent chaque match", () => {
    const a = alimentants(structure);
    expect(a.get("d1")).toEqual(["q1", "q2"]);
    expect(a.get("p3")).toEqual(["d1", "d2"]);
    expect(a.get("f")).toEqual(["d1", "d2"]);
    expect(a.has("q1")).toBe(false);
  });
});
