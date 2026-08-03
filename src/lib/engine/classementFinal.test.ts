import { describe, expect, it } from "vitest";
import { classementFinal, cumulJeuxGagnesTournoi } from "./classementFinal";

describe("classementFinal", () => {
  it("pas de petite finale : les deux demi-finalistes battus sont 3es ex æquo", () => {
    const resultat = classementFinal({
      finaleVainqueurId: "champion",
      finalePerdantId: "finaliste",
      demiFinalesPerdantIds: ["demi1", "demi2"],
      quartsPerdantIdsTries: ["quart1", "quart2", "quart3", "quart4"],
      nonQualifieIdsTries: ["nq1", "nq2"],
    });

    expect(resultat.find((e) => e.teamId === "champion")!.rang).toBe(1);
    expect(resultat.find((e) => e.teamId === "finaliste")!.rang).toBe(2);
    expect(resultat.find((e) => e.teamId === "demi1")!.rang).toBe(3);
    expect(resultat.find((e) => e.teamId === "demi2")!.rang).toBe(3);
  });

  it("le rang 4 est sauté (3, 3, 5...) et les quarts sont classés 5 à 8", () => {
    const resultat = classementFinal({
      finaleVainqueurId: "champion",
      finalePerdantId: "finaliste",
      demiFinalesPerdantIds: ["demi1", "demi2"],
      quartsPerdantIdsTries: ["quart1", "quart2", "quart3", "quart4"],
      nonQualifieIdsTries: [],
    });

    expect(resultat.find((e) => e.teamId === "quart1")!.rang).toBe(5);
    expect(resultat.find((e) => e.teamId === "quart2")!.rang).toBe(6);
    expect(resultat.find((e) => e.teamId === "quart3")!.rang).toBe(7);
    expect(resultat.find((e) => e.teamId === "quart4")!.rang).toBe(8);
    expect(resultat.some((e) => e.rang === 4)).toBe(false);
  });

  it("classe les non-qualifiés à la suite (9e et suivants)", () => {
    const resultat = classementFinal({
      finaleVainqueurId: "champion",
      finalePerdantId: "finaliste",
      demiFinalesPerdantIds: ["demi1", "demi2"],
      quartsPerdantIdsTries: ["quart1", "quart2", "quart3", "quart4"],
      nonQualifieIdsTries: ["nq1", "nq2", "nq3"],
    });

    expect(resultat.find((e) => e.teamId === "nq1")!.rang).toBe(9);
    expect(resultat.find((e) => e.teamId === "nq2")!.rang).toBe(10);
    expect(resultat.find((e) => e.teamId === "nq3")!.rang).toBe(11);
  });
});

describe("cumulJeuxGagnesTournoi", () => {
  it("cumule les jeux gagnés sur tous les matchs, poules et tableau confondus", () => {
    const matches = [
      { teamAId: "A", teamBId: "B", jeuxA: 7, jeuxB: 3 }, // poule
      { teamAId: "A", teamBId: "C", jeuxA: 7, jeuxB: 5 }, // poule
      { teamAId: "A", teamBId: "B", jeuxA: 7, jeuxB: 2 }, // tableau (re-confrontation)
    ];
    const resultat = cumulJeuxGagnesTournoi(matches, ["A", "B", "C"]);
    expect(resultat[0]).toEqual({ teamId: "A", jeuxGagnes: 21 });
    const b = resultat.find((r) => r.teamId === "B")!;
    const c = resultat.find((r) => r.teamId === "C")!;
    expect(b.jeuxGagnes).toBe(5);
    expect(c.jeuxGagnes).toBe(5);
  });
});
