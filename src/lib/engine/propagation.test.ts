import { describe, expect, it } from "vitest";
import { genererTableau, type Qualifie } from "./tableau";
import { propagerVainqueur } from "./propagation";

describe("propagerVainqueur", () => {
  it("fait remonter le vainqueur dans le match suivant", () => {
    const qualifies: Qualifie[] = Array.from({ length: 4 }, (_, i) => ({
      teamId: `seed${i + 1}`,
      groupId: `pool${i}`,
    }));
    const matches = genererTableau(qualifies);

    const apres = propagerVainqueur(matches, "t1-m1", "seed1");
    const t1m1 = apres.find((m) => m.id === "t1-m1")!;
    const finale = apres.find((m) => m.id === "t2-m1")!;

    expect(t1m1.winnerId).toBe("seed1");
    expect(finale.teamAId).toBe("seed1"); // t1-m1 -> nextSlot 'a'
    expect(finale.teamBId).toBeNull(); // l'autre demi n'a pas encore été jouée
  });

  it("ne modifie rien d'autre que le match joué et le suivant", () => {
    const qualifies: Qualifie[] = Array.from({ length: 4 }, (_, i) => ({
      teamId: `seed${i + 1}`,
      groupId: `pool${i}`,
    }));
    const matches = genererTableau(qualifies);
    const apres = propagerVainqueur(matches, "t1-m1", "seed1");
    const t1m2Avant = matches.find((m) => m.id === "t1-m2")!;
    const t1m2Apres = apres.find((m) => m.id === "t1-m2")!;
    expect(t1m2Apres).toEqual(t1m2Avant);
  });

  it("propage jusqu'à la finale au fil des deux demies", () => {
    const qualifies: Qualifie[] = Array.from({ length: 4 }, (_, i) => ({
      teamId: `seed${i + 1}`,
      groupId: `pool${i}`,
    }));
    let matches = genererTableau(qualifies);
    matches = propagerVainqueur(matches, "t1-m1", "seed1");
    matches = propagerVainqueur(matches, "t1-m2", "seed4");
    const finale = matches.find((m) => m.id === "t2-m1")!;
    expect(finale.teamAId).toBe("seed1");
    expect(finale.teamBId).toBe("seed4");
  });

  it("lève une erreur si le match n'existe pas", () => {
    const matches = genererTableau(
      Array.from({ length: 2 }, (_, i) => ({ teamId: `seed${i + 1}`, groupId: `p${i}` })),
    );
    expect(() => propagerVainqueur(matches, "inconnu", "seed1")).toThrow();
  });
});
