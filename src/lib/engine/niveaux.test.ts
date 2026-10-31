import { describe, expect, it } from "vitest";
import type { EquipeClassee } from "./classement";
import {
  classementFinalNiveaux,
  composerNiveaux,
  estimerNiveaux,
  niveauxSansRevanche,
  nombrePoulesMaxNiveaux,
  repartirPoulesNiveaux,
  tailleDesNiveaux,
} from "./niveaux";

const equipe = (teamId: string, rang: number): EquipeClassee => ({
  teamId,
  rang,
  joues: 0,
  v: 0,
  d: 0,
  setsG: 0,
  setsP: 0,
  jeuxG: 0,
  jeuxP: 0,
  ratioSets: 0,
  ratioJeux: 0,
});

describe("répartition en poules : autant de poules que possible, 3 équipes minimum", () => {
  it("9 équipes : 3 poules de 3", () => {
    const r = repartirPoulesNiveaux(9);
    expect(r.tailles).toEqual([3, 3, 3]);
    expect(r.niveaux).toEqual([3, 3, 3]);
    expect(r.avertissement).toBeUndefined();
  });

  it.each([
    [4, [4]],
    [5, [5]],
    [6, [3, 3]],
    [7, [4, 3]],
    [8, [4, 4]],
    [10, [4, 3, 3]],
    [11, [4, 4, 3]],
    [12, [3, 3, 3, 3]],
    [13, [4, 3, 3, 3]],
  ])("%i équipes : poules %j", (effectif, tailles) => {
    expect(repartirPoulesNiveaux(effectif).tailles).toEqual(tailles);
  });

  it("jamais de poule de moins de 3 équipes, poules équilibrées à une équipe près, somme = effectif", () => {
    for (let n = 4; n <= 60; n++) {
      const { tailles } = repartirPoulesNiveaux(n);
      expect(tailles.reduce((a, b) => a + b, 0)).toBe(n);
      expect(Math.min(...tailles)).toBeGreaterThanOrEqual(3);
      expect(Math.max(...tailles) - Math.min(...tailles)).toBeLessThanOrEqual(1);
      expect(tailles.length).toBe(nombrePoulesMaxNiveaux(n));
    }
  });

  it("l'organisateur peut imposer moins de poules, jamais plus que 3 équipes par poule ne le permettent", () => {
    expect(repartirPoulesNiveaux(12, { nombrePoulesForce: 2 }).tailles).toEqual([6, 6]);
    expect(repartirPoulesNiveaux(12, { nombrePoulesForce: 1 }).tailles).toEqual([12]);
    expect(() => repartirPoulesNiveaux(12, { nombrePoulesForce: 5 })).toThrow(/entre 1 et 4/);
    expect(() => repartirPoulesNiveaux(12, { nombrePoulesForce: 0 })).toThrow();
  });

  it("refuse moins de 4 équipes", () => {
    expect(() => repartirPoulesNiveaux(3)).toThrow(/au moins 4/);
    expect(() => repartirPoulesNiveaux(0)).toThrow();
  });

  it("avertit d'une poule unique et de niveaux trop grands", () => {
    expect(repartirPoulesNiveaux(5).avertissement).toMatch(/Une seule poule/);
    expect(repartirPoulesNiveaux(24).avertissement).toMatch(/réduis le nombre de poules/); // 8 poules de 3 : niveaux de 8
  });
});

describe("garantie : au moins 3 matchs par équipe, classement entièrement joué", () => {
  it("de 4 à 60 équipes, l'équipe qui joue le moins joue 3 matchs ou plus", () => {
    for (let n = 4; n <= 60; n++) {
      const { tailles } = repartirPoulesNiveaux(n);
      expect(estimerNiveaux(tailles, 3).matchsMin).toBeGreaterThanOrEqual(3);
    }
  });

  it("aussi quand l'organisateur impose le nombre de poules", () => {
    for (let n = 6; n <= 40; n++) {
      for (let p = 2; p <= nombrePoulesMaxNiveaux(n); p++) {
        const { tailles } = repartirPoulesNiveaux(n, { nombrePoulesForce: p });
        expect(estimerNiveaux(tailles, 3).matchsMin).toBeGreaterThanOrEqual(3);
      }
    }
  });
});

describe("niveaux du second tour", () => {
  it("tailles : le niveau k réunit les équipes de rang k de chaque poule assez grande", () => {
    expect(tailleDesNiveaux([3, 3, 3])).toEqual([3, 3, 3]);
    expect(tailleDesNiveaux([4, 3, 3])).toEqual([3, 3, 3, 1]);
    expect(tailleDesNiveaux([4, 4, 3])).toEqual([3, 3, 3, 2]);
    expect(tailleDesNiveaux([6])).toEqual([1, 1, 1, 1, 1, 1]);
  });

  const classements = [
    { groupId: "A", equipes: [equipe("a1", 1), equipe("a2", 2), equipe("a3", 3), equipe("a4", 4)] },
    { groupId: "B", equipes: [equipe("b1", 1), equipe("b2", 2), equipe("b3", 3)] },
    { groupId: "C", equipes: [equipe("c1", 1), equipe("c2", 2), equipe("c3", 3)] },
  ];

  it("compose un niveau par rang ; un niveau d'une seule équipe ne joue pas", () => {
    const niveaux = composerNiveaux(classements);
    expect(niveaux.map((n) => n.equipeIds)).toEqual([
      ["a1", "b1", "c1"],
      ["a2", "b2", "c2"],
      ["a3", "b3", "c3"],
      ["a4"],
    ]);
    expect(niveaux.map((n) => n.joue)).toEqual([true, true, true, false]);
  });

  it("un niveau de 2 équipes est un match de classement", () => {
    const deux = [
      { groupId: "A", equipes: [equipe("a1", 1), equipe("a2", 2), equipe("a3", 3), equipe("a4", 4)] },
      { groupId: "B", equipes: [equipe("b1", 1), equipe("b2", 2), equipe("b3", 3), equipe("b4", 4)] },
      { groupId: "C", equipes: [equipe("c1", 1), equipe("c2", 2), equipe("c3", 3)] },
    ];
    const n = composerNiveaux(deux);
    expect(n[3].equipeIds).toEqual(["a4", "b4"]);
    expect(n[3].joue).toBe(true);
  });

  it("deux équipes d'un même niveau ne viennent jamais de la même poule (aucune revanche)", () => {
    const pouleDe = (id: string) => classements.find((c) => c.equipes.some((e) => e.teamId === id))!.groupId;
    expect(niveauxSansRevanche(composerNiveaux(classements), pouleDe)).toBe(true);
  });
});

describe("classement final", () => {
  it("le niveau 1 prend les premières places, le niveau 2 les suivantes, etc.", () => {
    const final = classementFinalNiveaux([
      { niveau: 2, equipes: [equipe("a2", 1), equipe("b2", 2), equipe("c2", 3)] },
      { niveau: 1, equipes: [equipe("b1", 1), equipe("a1", 2), equipe("c1", 3)] },
      { niveau: 3, equipes: [equipe("c3", 1), equipe("a3", 2), equipe("b3", 3)] },
    ]);
    expect(final.map((l) => [l.rang, l.equipeId])).toEqual([
      [1, "b1"], [2, "a1"], [3, "c1"],
      [4, "a2"], [5, "b2"], [6, "c2"],
      [7, "c3"], [8, "a3"], [9, "b3"],
    ]);
  });

  it("conserve les ex æquo à l'intérieur d'un niveau", () => {
    const final = classementFinalNiveaux([
      { niveau: 1, equipes: [equipe("a", 1), equipe("b", 1), equipe("c", 3)] },
      { niveau: 2, equipes: [equipe("d", 1), equipe("e", 2), equipe("f", 3)] },
    ]);
    expect(final.map((l) => l.rang)).toEqual([1, 1, 3, 4, 5, 6]);
  });

  it("un niveau d'une équipe garde sa place dans la suite", () => {
    const final = classementFinalNiveaux([
      { niveau: 1, equipes: [equipe("a", 1), equipe("b", 2)] },
      { niveau: 2, equipes: [equipe("c", 1)] },
      { niveau: 3, equipes: [equipe("d", 1), equipe("e", 2)] },
    ]);
    expect(final.map((l) => [l.rang, l.equipeId])).toEqual([[1, "a"], [2, "b"], [3, "c"], [4, "d"], [5, "e"]]);
  });
});

describe("estimation : le cas du tournoi de 9 équipes sur 3 terrains", () => {
  it("3 poules de 3 puis 3 niveaux de 3 : 18 matchs, 4 matchs chacune, 6 créneaux", () => {
    const e = estimerNiveaux([3, 3, 3], 3);
    expect(e).toMatchObject({ nbMatchsPremierTour: 9, nbMatchsSecondTour: 9, nbMatchs: 18, matchsMin: 4, matchsMax: 4, creneauxMin: 6 });
  });

  it("poule unique : pas de second tour", () => {
    const e = estimerNiveaux([5], 3);
    expect(e).toMatchObject({ nbMatchsPremierTour: 10, nbMatchsSecondTour: 0, matchsMin: 4, matchsMax: 4 });
  });

  it("poules de 4 et 3 : le dernier de la poule de 4 joue 3 matchs, ses coéquipiers de poule jusqu'à 5", () => {
    const e = estimerNiveaux([4, 3, 3], 3);
    expect(e.matchsMin).toBe(3);
    expect(e.matchsMax).toBe(5);
  });
});
