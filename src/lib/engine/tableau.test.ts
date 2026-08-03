import { describe, expect, it } from "vitest";
import { genererTableau, type Qualifie } from "./tableau";

function match(matches: ReturnType<typeof genererTableau>, id: string) {
  return matches.find((m) => m.id === id)!;
}

describe("genererTableau — seeding standard", () => {
  it("tableau de 8 : quarts 1-8, 4-5, 2-7, 3-6", () => {
    const qualifies: Qualifie[] = Array.from({ length: 8 }, (_, i) => ({
      teamId: `seed${i + 1}`,
      groupId: `pool${i}`, // tous différents : pas de conflit possible
    }));
    const matches = genererTableau(qualifies);
    const tour1 = matches.filter((m) => m.round === 1).sort((a, b) => a.bracketSlot - b.bracketSlot);

    expect(tour1.map((m) => [m.teamAId, m.teamBId])).toEqual([
      ["seed1", "seed8"],
      ["seed4", "seed5"],
      ["seed2", "seed7"],
      ["seed3", "seed6"],
    ]);
  });

  it("câble correctement la propagation (tableau de 4)", () => {
    const qualifies: Qualifie[] = Array.from({ length: 4 }, (_, i) => ({
      teamId: `seed${i + 1}`,
      groupId: `pool${i}`,
    }));
    const matches = genererTableau(qualifies);
    expect(matches).toHaveLength(3); // 2 demi-finales (nommées t1) + 1 finale (t2)

    const t1m1 = match(matches, "t1-m1");
    const t1m2 = match(matches, "t1-m2");
    const finale = match(matches, "t2-m1");

    expect(t1m1.nextMatchId).toBe("t2-m1");
    expect(t1m1.nextSlot).toBe("a");
    expect(t1m2.nextMatchId).toBe("t2-m1");
    expect(t1m2.nextSlot).toBe("b");
    expect(finale.teamAId).toBeNull();
    expect(finale.teamBId).toBeNull();
    expect(finale.nextMatchId).toBeNull();
  });

  it("refuse un nombre d'équipes qui n'est pas une puissance de 2", () => {
    const qualifies: Qualifie[] = Array.from({ length: 6 }, (_, i) => ({
      teamId: `seed${i + 1}`,
      groupId: `pool${i}`,
    }));
    expect(() => genererTableau(qualifies)).toThrow();
  });
});

describe("genererTableau — contrainte anti-même-poule", () => {
  it("corrige le tirage standard quand il opposerait deux équipes de la même poule au 1er tour", () => {
    // Avec le seeding standard [1,8,4,5,2,7,3,6], seed4 et seed5 sont dans
    // la même poule B : conflit à corriger.
    const qualifies: Qualifie[] = [
      { teamId: "seed1", groupId: "A" },
      { teamId: "seed2", groupId: "A" },
      { teamId: "seed3", groupId: "C" },
      { teamId: "seed4", groupId: "B" },
      { teamId: "seed5", groupId: "B" },
      { teamId: "seed6", groupId: "A" },
      { teamId: "seed7", groupId: "C" },
      { teamId: "seed8", groupId: "B" },
    ];

    const matches = genererTableau(qualifies);
    const tour1 = matches.filter((m) => m.round === 1);

    for (const m of tour1) {
      const groupeA = qualifies.find((q) => q.teamId === m.teamAId)!.groupId;
      const groupeB = qualifies.find((q) => q.teamId === m.teamBId)!.groupId;
      expect(groupeA).not.toBe(groupeB);
    }
  });
});
