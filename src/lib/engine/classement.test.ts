import { describe, expect, it } from "vitest";
import { calculerClassement, type MatchTermine } from "./classement";

function rang(classement: ReturnType<typeof calculerClassement>, teamId: string): number {
  return classement.find((e) => e.teamId === teamId)!.rang;
}

describe("calculerClassement — cas simple", () => {
  it("classe par nombre de victoires quand il n'y a pas d'égalité", () => {
    const matches: MatchTermine[] = [
      { teamAId: "A", teamBId: "B", vainqueurId: "A", setsA: 1, setsB: 0, jeuxA: 7, jeuxB: 3 },
      { teamAId: "A", teamBId: "C", vainqueurId: "A", setsA: 1, setsB: 0, jeuxA: 7, jeuxB: 2 },
      { teamAId: "B", teamBId: "C", vainqueurId: "B", setsA: 1, setsB: 0, jeuxA: 7, jeuxB: 4 },
    ];
    const classement = calculerClassement(matches, ["A", "B", "C"], ["victoires"]);
    expect(rang(classement, "A")).toBe(1);
    expect(rang(classement, "B")).toBe(2);
    expect(rang(classement, "C")).toBe(3);
  });
});

describe("calculerClassement — confrontation directe (2 équipes à égalité)", () => {
  it("départage deux égalités de victoires par le résultat du face-à-face", () => {
    // W et Y sont à égalité à 2 victoires : Y a battu W en direct.
    // X et Z sont à égalité à 1 victoire : Z a battu X en direct.
    const matches: MatchTermine[] = [
      { teamAId: "W", teamBId: "X", vainqueurId: "W", setsA: 1, setsB: 0, jeuxA: 7, jeuxB: 3 },
      { teamAId: "W", teamBId: "Y", vainqueurId: "Y", setsA: 0, setsB: 1, jeuxA: 4, jeuxB: 7 },
      { teamAId: "W", teamBId: "Z", vainqueurId: "W", setsA: 1, setsB: 0, jeuxA: 7, jeuxB: 5 },
      { teamAId: "X", teamBId: "Y", vainqueurId: "X", setsA: 1, setsB: 0, jeuxA: 7, jeuxB: 4 },
      { teamAId: "X", teamBId: "Z", vainqueurId: "Z", setsA: 0, setsB: 1, jeuxA: 3, jeuxB: 7 },
      { teamAId: "Y", teamBId: "Z", vainqueurId: "Y", setsA: 1, setsB: 0, jeuxA: 7, jeuxB: 2 },
    ];
    const classement = calculerClassement(
      matches,
      ["W", "X", "Y", "Z"],
      ["victoires", "confrontation_directe"],
    );
    expect(rang(classement, "Y")).toBe(1);
    expect(rang(classement, "W")).toBe(2);
    expect(rang(classement, "Z")).toBe(3);
    expect(rang(classement, "X")).toBe(4);
  });
});

describe("calculerClassement — mini-classement (3 équipes ou plus à égalité)", () => {
  it("départage une égalité à 3 par un mini-classement entre les équipes concernées", () => {
    // P, Q, R sont à égalité à 2 victoires chacune, mais leurs confrontations
    // directes (P vs Q, P vs R, Q vs R) donnent un ordre clair : Q > R > P.
    const matches: MatchTermine[] = [
      { teamAId: "P", teamBId: "Q", vainqueurId: "Q", setsA: 0, setsB: 1, jeuxA: 4, jeuxB: 7 },
      { teamAId: "P", teamBId: "R", vainqueurId: "R", setsA: 0, setsB: 1, jeuxA: 5, jeuxB: 7 },
      { teamAId: "Q", teamBId: "R", vainqueurId: "Q", setsA: 1, setsB: 0, jeuxA: 7, jeuxB: 3 },
      { teamAId: "P", teamBId: "Pw1", vainqueurId: "P", setsA: 1, setsB: 0, jeuxA: 7, jeuxB: 1 },
      { teamAId: "P", teamBId: "Pw2", vainqueurId: "P", setsA: 1, setsB: 0, jeuxA: 7, jeuxB: 2 },
      { teamAId: "R", teamBId: "Rw", vainqueurId: "R", setsA: 1, setsB: 0, jeuxA: 7, jeuxB: 3 },
    ];
    const classement = calculerClassement(
      matches,
      ["P", "Q", "R", "Pw1", "Pw2", "Rw"],
      ["victoires", "mini_classement"],
    );
    expect(rang(classement, "Q")).toBeLessThan(rang(classement, "R"));
    expect(rang(classement, "R")).toBeLessThan(rang(classement, "P"));
  });
});

describe("calculerClassement — critère non discriminant ignoré silencieusement", () => {
  it("passe au critère suivant quand la différence de sets ne départage rien (ex. 1 set sec)", () => {
    // M et N sont à égalité de victoires (1 chacune) ET de différence de
    // sets (0 chacune, un set gagné un set perdu) : seul le ratio de jeux
    // les différencie.
    const matches: MatchTermine[] = [
      { teamAId: "M", teamBId: "D1", vainqueurId: "M", setsA: 1, setsB: 0, jeuxA: 7, jeuxB: 2 },
      { teamAId: "M", teamBId: "D2", vainqueurId: "D2", setsA: 0, setsB: 1, jeuxA: 5, jeuxB: 7 },
      { teamAId: "N", teamBId: "D3", vainqueurId: "N", setsA: 1, setsB: 0, jeuxA: 7, jeuxB: 5 },
      { teamAId: "N", teamBId: "D4", vainqueurId: "D4", setsA: 0, setsB: 1, jeuxA: 2, jeuxB: 7 },
    ];
    const classement = calculerClassement(
      matches,
      ["M", "N", "D1", "D2", "D3", "D4"],
      ["victoires", "difference_sets", "ratio_jeux"],
    );
    expect(rang(classement, "M")).toBeLessThan(rang(classement, "N"));
  });
});
