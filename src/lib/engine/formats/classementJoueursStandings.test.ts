import { describe, expect, it } from "vitest";
import { calculerStandingsJoueurs, type MancheBrute } from "@/lib/tournoi/classementJoueurs";

const joueurs = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, nomAffiche: `Joueur ${i + 1}` }));
const manche = (id: string, tour: number, a: string, b: string, pointsA: number, pointsB: number, extra: Partial<MancheBrute> = {}): MancheBrute => ({
  id,
  tour,
  statut: "valide",
  winnerId: pointsA === pointsB ? null : pointsA > pointsB ? a : b,
  teamAId: a,
  teamBId: b,
  pointsA,
  pointsB,
  ...extra,
});

describe("standings_joueurs : classement individuel recalculé à la main", () => {
  // 8 joueurs, 2 tours de 2 manches, total de 24 points. Vérifié à la main :
  // marqués  p1 14+9=23, p2 14+16=30, p3 10+9=19, p4 10+16=26, p5 13+15=28, p6 13+8=21, p7 11+15=26, p8 11+8=19
  // encaissés p1 25, p2 18, p3 29, p4 22, p5 20, p6 27, p7 22, p8 29
  const equipes = new Map<string, [string, string]>([
    ["e1", ["p1", "p2"]], ["e2", ["p3", "p4"]], ["e3", ["p5", "p6"]], ["e4", ["p7", "p8"]],
    ["e5", ["p1", "p3"]], ["e6", ["p5", "p7"]], ["e7", ["p2", "p4"]], ["e8", ["p6", "p8"]],
  ]);
  const manches = [
    manche("m1", 1, "e1", "e2", 14, 10),
    manche("m2", 1, "e3", "e4", 13, 11),
    manche("m3", 2, "e5", "e6", 9, 15),
    manche("m4", 2, "e7", "e8", 16, 8),
  ];
  const lignes = calculerStandingsJoueurs({ joueurs: joueurs(8), manches, equipes, config: {} });
  const de = (id: string) => lignes.find((l) => l.playerId === id)!;

  it("cumule points, différence et victoires", () => {
    expect(lignes.map((l) => [l.playerId, l.pointsMarques, l.pointsEncaisses, l.difference, l.victoires])).toEqual(
      expect.arrayContaining([
        ["p1", 23, 25, -2, 1],
        ["p2", 30, 18, 12, 2],
        ["p3", 19, 29, -10, 0],
        ["p4", 26, 22, 4, 1],
        ["p5", 28, 20, 8, 2],
        ["p6", 21, 27, -6, 1],
        ["p7", 26, 22, 4, 1],
        ["p8", 19, 29, -10, 0],
      ]),
    );
    for (const l of lignes) expect(l.manchesJouees).toBe(2);
  });

  it("classe par points marqués ; les égalités parfaites partagent leur rang", () => {
    expect(Object.fromEntries(lignes.map((l) => [l.playerId, l.rang]))).toEqual({
      p2: 1, p5: 2, p4: 3, p7: 3, p1: 5, p6: 6, p3: 7, p8: 7,
    });
  });

  it("points par manche et nom affiché", () => {
    expect(de("p2").pointsParManche).toBe(15);
    expect(de("p1").pointsParManche).toBe(11.5);
    expect(de("p3").nomAffiche).toBe("Joueur 3");
  });

  it("aucune exemption quand tout le monde joue", () => {
    expect(lignes.every((l) => l.toursExempt === 0)).toBe(true);
  });
});

describe("standings_joueurs : exemptions, tours en cours, forfaits, nuls", () => {
  const equipes = new Map<string, [string, string]>([
    ["e1", ["p1", "p2"]], ["e2", ["p3", "p4"]], ["e3", ["p5", "p1"]], ["e4", ["p2", "p3"]],
  ]);

  it("un tour terminé compte une exemption à celui qui n'y jouait pas", () => {
    const lignes = calculerStandingsJoueurs({
      joueurs: joueurs(5),
      manches: [manche("m1", 1, "e1", "e2", 15, 9)],
      equipes,
      config: {},
    });
    expect(lignes.find((l) => l.playerId === "p5")).toMatchObject({ toursExempt: 1, manchesJouees: 0, pointsMarques: 0 });
    expect(lignes.find((l) => l.playerId === "p1")).toMatchObject({ toursExempt: 0, manchesJouees: 1, pointsMarques: 15 });
  });

  it("un tour dont une manche n'est pas validée n'ajoute aucune exemption", () => {
    const lignes = calculerStandingsJoueurs({
      joueurs: joueurs(9),
      manches: [
        manche("m1", 1, "e1", "e2", 15, 9),
        manche("m2", 1, "e3", "e4", 0, 0, { statut: "saisi", winnerId: null }),
      ],
      equipes,
      config: {},
    });
    expect(lignes.every((l) => l.toursExempt === 0)).toBe(true);
    // La manche non validée ne marque aucun point.
    expect(lignes.find((l) => l.playerId === "p5")!.pointsMarques).toBe(0);
  });

  it("un forfait donne la victoire sans point ; un nul (manche) donne zéro victoire aux deux camps", () => {
    const forfait = calculerStandingsJoueurs({
      joueurs: joueurs(4),
      manches: [manche("m1", 1, "e1", "e2", 0, 0, { statut: "forfait", winnerId: "e2" })],
      equipes,
      config: {},
    });
    expect(forfait.find((l) => l.playerId === "p3")).toMatchObject({ victoires: 1, pointsMarques: 0, manchesJouees: 1 });
    expect(forfait.find((l) => l.playerId === "p1")).toMatchObject({ victoires: 0 });

    const nul = calculerStandingsJoueurs({
      joueurs: joueurs(4),
      manches: [manche("m1", 1, "e1", "e2", 12, 12)],
      equipes,
      config: {},
    });
    expect(nul.every((l) => l.victoires === 0 && l.pointsMarques === 12 && l.difference === 0)).toBe(true);
    expect(nul.every((l) => l.rang === 1)).toBe(true);
  });

  it("sans aucune manche : tout le monde à zéro, ex æquo, rien d'infini ni de NaN", () => {
    const lignes = calculerStandingsJoueurs({ joueurs: joueurs(6), manches: [], equipes, config: {} });
    expect(lignes).toHaveLength(6);
    for (const l of lignes) {
      expect(l).toMatchObject({ manchesJouees: 0, pointsMarques: 0, pointsParManche: 0, toursExempt: 0, rang: 1 });
    }
  });

  it("le mode « points par manche » classe sur la moyenne", () => {
    // p5 : 1 manche à 20 pts ; p1 : 2 manches à 12 + 11 = 23 pts mais moyenne 11,5.
    const eq = new Map<string, [string, string]>([
      ["a", ["p1", "p2"]], ["b", ["p3", "p4"]], ["c", ["p5", "p6"]], ["d", ["p7", "p8"]],
      ["e", ["p1", "p3"]], ["f", ["p2", "p4"]],
    ]);
    const manches = [
      manche("m1", 1, "a", "b", 12, 12),
      manche("m2", 1, "c", "d", 20, 4),
      manche("m3", 2, "e", "f", 11, 13),
    ];
    const total = calculerStandingsJoueurs({ joueurs: joueurs(8), manches, equipes: eq, config: {} });
    const moyenne = calculerStandingsJoueurs({ joueurs: joueurs(8), manches, equipes: eq, config: { modeClassement: "par_manche" } });
    expect(total.find((l) => l.playerId === "p1")!.rang).toBeLessThan(total.find((l) => l.playerId === "p5")!.rang); // 23 > 20 en total
    expect(moyenne.find((l) => l.playerId === "p5")!.rang).toBeLessThan(moyenne.find((l) => l.playerId === "p1")!.rang); // 20 > 11,5 en moyenne
  });
});
