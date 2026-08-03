import { describe, expect, it } from "vitest";
import { genererTours } from "./tours";

function tousLesPairesJouees(equipeIds: string[]): Set<string> {
  const paires = new Set<string>();
  for (let i = 0; i < equipeIds.length; i++) {
    for (let j = i + 1; j < equipeIds.length; j++) {
      paires.add([equipeIds[i], equipeIds[j]].sort().join("-"));
    }
  }
  return paires;
}

describe("genererTours", () => {
  it("poule de 4 : 3 tours, 6 matchs, aucun exempt", () => {
    const equipes = ["e1", "e2", "e3", "e4"];
    const tours = genererTours(equipes);
    expect(tours).toHaveLength(3);
    const totalMatchs = tours.reduce((s, t) => s + t.rencontres.length, 0);
    expect(totalMatchs).toBe(6);
    expect(tours.every((t) => t.exempt === null)).toBe(true);
  });

  it("poule de 5 : 5 tours, 10 matchs, un exempt par tour", () => {
    const equipes = ["e1", "e2", "e3", "e4", "e5"];
    const tours = genererTours(equipes);
    expect(tours).toHaveLength(5);
    const totalMatchs = tours.reduce((s, t) => s + t.rencontres.length, 0);
    expect(totalMatchs).toBe(10);
    expect(tours.every((t) => t.exempt !== null)).toBe(true);
  });

  it("chaque paire d'équipes se rencontre exactement une fois", () => {
    const equipes = ["e1", "e2", "e3", "e4", "e5", "e6", "e7"];
    const tours = genererTours(equipes);
    const attendues = tousLesPairesJouees(equipes);
    const jouees = new Set<string>();
    for (const tour of tours) {
      for (const [a, b] of tour.rencontres) {
        jouees.add([a, b].sort().join("-"));
      }
    }
    expect(jouees).toEqual(attendues);
  });

  it("aucune équipe ne joue deux fois dans le même tour", () => {
    const equipes = ["e1", "e2", "e3", "e4", "e5", "e6"];
    const tours = genererTours(equipes);
    for (const tour of tours) {
      const joueurs = tour.rencontres.flat();
      expect(new Set(joueurs).size).toBe(joueurs.length);
    }
  });

  it("chaque équipe est exemptée exactement une fois dans une poule impaire", () => {
    const equipes = ["e1", "e2", "e3", "e4", "e5"];
    const tours = genererTours(equipes);
    const exemptes = tours.map((t) => t.exempt);
    expect([...exemptes].sort()).toEqual([...equipes].sort());
  });
});
