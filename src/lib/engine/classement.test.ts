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

describe("calculerClassement — ratios : jamais d'Infinity ni de NaN", () => {
  const matches: MatchTermine[] = [
    { teamAId: "A", teamBId: "B", vainqueurId: "A", setsA: 1, setsB: 0, jeuxA: 7, jeuxB: 3 },
    { teamAId: "A", teamBId: "C", vainqueurId: "A", setsA: 1, setsB: 0, jeuxA: 7, jeuxB: 2 },
  ];
  const classement = calculerClassement(matches, ["A", "B", "C", "D"], ["victoires", "ratio_sets", "ratio_jeux"]);
  const stats = (id: string) => classement.find((e) => e.teamId === id)!;

  it("équipe invaincue en format 1 set : ratio de sets = 1, fini (pas Infinity)", () => {
    expect(stats("A").setsP).toBe(0);
    expect(stats("A").ratioSets).toBe(1);
    expect(Number.isFinite(stats("A").ratioSets)).toBe(true);
    expect(stats("A").ratioJeux).toBeCloseTo(14 / 19);
  });

  it("équipe à zéro match joué : tous ses ratios valent 0 (pas NaN)", () => {
    expect(stats("D").joues).toBe(0);
    expect(stats("D").ratioSets).toBe(0);
    expect(stats("D").ratioJeux).toBe(0);
    expect(Number.isNaN(stats("D").ratioSets)).toBe(false);
  });

  it("équipe qui a tout perdu : ratio 0, distinct d'une équipe à zéro match seulement par les victoires", () => {
    expect(stats("B").ratioSets).toBe(0);
    expect(stats("B").d).toBe(1);
  });

  it("aucune valeur numérique du classement n'est NaN ou infinie, et les rangs sont des entiers 1..n", () => {
    for (const e of classement) {
      for (const v of [e.ratioSets, e.ratioJeux, e.rang, e.v, e.d, e.joues]) {
        expect(Number.isFinite(v)).toBe(true);
      }
    }
    expect(classement.map((e) => e.rang).sort()).toEqual([1, 2, 3, 4]);
  });

  it("le tri ne dépend pas de l'ordre d'entrée avec une équipe à zéro match", () => {
    const a = calculerClassement(matches, ["A", "B", "C", "D"], ["victoires", "ratio_sets", "ratio_jeux"]);
    const b = calculerClassement(matches, ["D", "C", "B", "A"], ["victoires", "ratio_sets", "ratio_jeux"]);
    expect(rang(a, "A")).toBe(1);
    expect(rang(b, "A")).toBe(1);
    expect(rang(a, "D")).toBeGreaterThan(rang(a, "A"));
  });
});

describe("calculerClassement — chaîne de départage réentrante", () => {
  const CRITERES: Parameters<typeof calculerClassement>[2] = [
    "victoires",
    "confrontation_directe",
    "mini_classement",
    "ratio_sets",
    "ratio_jeux",
  ];
  const m = (a: string, b: string, jeuxA: number, jeuxB: number): MatchTermine => ({
    teamAId: a,
    teamBId: b,
    vainqueurId: jeuxA > jeuxB ? a : b,
    setsA: jeuxA > jeuxB ? 1 : 0,
    setsB: jeuxA > jeuxB ? 0 : 1,
    jeuxA,
    jeuxB,
  });

  it("trois équipes à égalité : le ratio de jeux en isole une, puis la confrontation directe départage les deux restantes", () => {
    // A bat tout le monde. B, C, D : cycle B>C, C>D, D>B (mini-classement 1-1-1, ratio de sets égal).
    // C et D ont exactement les mêmes jeux (10 gagnés, 17 perdus) ; B a un meilleur ratio.
    const matches = [
      m("A", "B", 7, 6), m("A", "C", 7, 2), m("A", "D", 7, 0),
      m("B", "C", 7, 1), m("C", "D", 7, 3), m("D", "B", 7, 3),
    ];
    const c = calculerClassement(matches, ["A", "B", "C", "D"], CRITERES);
    const get = (id: string) => c.find((e) => e.teamId === id)!;
    expect(get("C").ratioJeux).toBe(get("D").ratioJeux);
    expect(get("B").ratioJeux).toBeGreaterThan(get("C").ratioJeux);
    expect([get("A").rang, get("B").rang, get("C").rang, get("D").rang]).toEqual([1, 2, 3, 4]);
  });

  it("mini-classement : sépare un groupe de trois par leurs victoires entre elles, avant les ratios", () => {
    // X, Y, Z ont 2 victoires chacune (P2 en a 3, P1 une). Entre elles : X>Y, X>Z, Y>Z (serrés, 7-6).
    // Contre P1/P2 : X perd lourdement, Z gagne largement : les ratios de jeux classent Z>Y>X,
    // à l'envers du mini-classement (X 2 victoires entre elles, Y 1, Z 0).
    const matches = [
      m("X", "Y", 7, 6), m("X", "Z", 7, 6), m("Y", "Z", 7, 6),
      m("P1", "X", 7, 0), m("P2", "X", 7, 0),
      m("Y", "P1", 7, 5), m("P2", "Y", 7, 5),
      m("Z", "P1", 7, 0), m("Z", "P2", 7, 0),
      m("P2", "P1", 7, 5),
    ];
    const c = calculerClassement(matches, ["P1", "P2", "X", "Y", "Z"], CRITERES);
    const get = (id: string) => c.find((e) => e.teamId === id)!;
    expect(["X", "Y", "Z"].map((id) => get(id).v)).toEqual([2, 2, 2]);
    expect(get("Z").ratioJeux).toBeGreaterThan(get("Y").ratioJeux);
    expect(get("Y").ratioJeux).toBeGreaterThan(get("X").ratioJeux);
    expect([get("P2").rang, get("X").rang, get("Y").rang, get("Z").rang, get("P1").rang]).toEqual([1, 2, 3, 4, 5]);
  });

  it("égalité parfaite en bout de chaîne : le groupe reste ex æquo et la récursion s'arrête", () => {
    // Cycle X>Y>Z>X, tous les scores identiques : aucun critère ne sépare personne.
    const matches = [m("X", "Y", 7, 3), m("Y", "Z", 7, 3), m("Z", "X", 7, 3)];
    const c = calculerClassement(matches, ["X", "Y", "Z"], CRITERES);
    expect(c.map((e) => e.rang)).toEqual([1, 1, 1]);
  });

  it("une liste de critères vide laisse tout le monde ex æquo sans boucler", () => {
    expect(calculerClassement([m("A", "B", 7, 3)], ["A", "B"], []).map((e) => e.rang)).toEqual([1, 1]);
  });

  it("les critères d'une liste réduite à un critère non applicable sont sautés", () => {
    const c = calculerClassement([m("A", "B", 7, 3)], ["A", "B"], ["mini_classement"]);
    expect(c.map((e) => e.rang)).toEqual([1, 1]);
  });
});
