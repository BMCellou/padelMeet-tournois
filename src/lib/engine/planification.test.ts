import { describe, expect, it } from "vitest";
import { planifier, type Court, type MatchAPlanifier } from "./planification";

const OPTIONS_DEFAUT = {
  heureDebut: "2026-07-25T09:00:00.000Z",
  dureeJeuMin: 25,
  rotationMin: 5,
  reposMinMin: 15,
};

const COURTS: Court[] = [
  { id: "court1", ordre: 1 },
  { id: "court2", ordre: 2 },
];

describe("planifier", () => {
  it("remplit tous les terrains avant d'ouvrir un nouveau créneau", () => {
    const matches: MatchAPlanifier[] = [
      { id: "m1", groupId: "A", round: 1, teamAId: "A1", teamBId: "A2" },
      { id: "m2", groupId: "A", round: 1, teamAId: "A3", teamBId: "A4" },
    ];
    const planning = planifier(matches, COURTS, OPTIONS_DEFAUT);
    expect(planning).toHaveLength(2);
    expect(planning[0].debut).toBe(planning[1].debut);
    expect(new Set(planning.map((p) => p.courtId)).size).toBe(2);
  });

  it("ne joue jamais deux matchs d'une même équipe en même temps", () => {
    const matches: MatchAPlanifier[] = [
      { id: "m1", groupId: "A", round: 1, teamAId: "A1", teamBId: "A2" },
      { id: "m2", groupId: "A", round: 2, teamAId: "A1", teamBId: "A3" },
    ];
    const planning = planifier(matches, COURTS, OPTIONS_DEFAUT);
    expect(planning[0].debut).not.toBe(planning[1].debut);
  });

  it("respecte le repos minimum entre deux matchs d'une même équipe", () => {
    const matches: MatchAPlanifier[] = [
      { id: "m1", groupId: "A", round: 1, teamAId: "A1", teamBId: "A2" },
      { id: "m2", groupId: "A", round: 2, teamAId: "A1", teamBId: "A3" },
    ];
    const planning = planifier(matches, COURTS, OPTIONS_DEFAUT);
    const m1 = planning.find((p) => p.matchId === "m1")!;
    const m2 = planning.find((p) => p.matchId === "m2")!;
    const finM1 = new Date(m1.fin).getTime();
    const debutM2 = new Date(m2.debut).getTime();
    expect(debutM2 - finM1).toBeGreaterThanOrEqual(OPTIONS_DEFAUT.reposMinMin * 60_000);
  });

  it("place tous les matchs (aucun perdu)", () => {
    const matches: MatchAPlanifier[] = Array.from({ length: 10 }, (_, i) => ({
      id: `m${i}`,
      groupId: i % 2 === 0 ? "A" : "B",
      round: Math.floor(i / 2) + 1,
      teamAId: `t${i}a`,
      teamBId: `t${i}b`,
    }));
    const planning = planifier(matches, COURTS, OPTIONS_DEFAUT);
    expect(planning).toHaveLength(10);
    expect(new Set(planning.map((p) => p.matchId)).size).toBe(10);
  });

  it("refuse s'il n'y a aucun terrain", () => {
    const matches: MatchAPlanifier[] = [
      { id: "m1", groupId: "A", round: 1, teamAId: "A1", teamBId: "A2" },
    ];
    expect(() => planifier(matches, [], OPTIONS_DEFAUT)).toThrow();
  });
});
