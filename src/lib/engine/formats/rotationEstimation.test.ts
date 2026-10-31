import { describe, expect, it } from "vitest";
import { getFormat, listerFormats } from "./index";
import { libelleCompteurJoueurs } from "@/lib/inscriptions/places";

const rotation = getFormat("americano").rotation!;

describe("capacité de rotation : estimation de la création du tournoi", () => {
  it("seuls les formats à partenaires tournants la déclarent", () => {
    for (const f of listerFormats()) expect(!!f.rotation).toBe(f.partenaire === "tournant");
  });

  it("16 joueurs, 4 terrains, 7 tours de 15 min avec 5 min de rotation : 7 × 15 + 6 × 5 = 135 min", () => {
    expect(rotation.estimer({ effectif: 16, terrains: 4, nbTours: 7, dureeMancheMin: 15, pauseMin: 5 })).toEqual({
      dureeMin: 135,
      manchesParTour: 4,
      nbManches: 28,
      exemptesParTour: 0,
    });
  });

  it("10 joueurs : 2 manches par tour et 2 exemptés par tour", () => {
    expect(rotation.estimer({ effectif: 10, terrains: 3, nbTours: 8, dureeMancheMin: 20, pauseMin: 5 })).toMatchObject({
      manchesParTour: 2,
      exemptesParTour: 2,
      nbManches: 16,
      dureeMin: 8 * 20 + 7 * 5,
    });
  });

  it("peu de terrains : les joueurs en trop sont exemptés même si l'effectif est un multiple de 4", () => {
    expect(rotation.exemptesParTour(16, 2)).toBe(8);
    expect(rotation.exemptesParTour(16, 4)).toBe(0);
  });

  it("un seul tour n'a pas de pause ; zéro tour = zéro minute", () => {
    expect(rotation.estimer({ effectif: 8, terrains: 2, nbTours: 1, dureeMancheMin: 20, pauseMin: 5 }).dureeMin).toBe(20);
    expect(rotation.estimer({ effectif: 8, terrains: 2, nbTours: 0, dureeMancheMin: 20, pauseMin: 5 }).dureeMin).toBe(0);
  });

  it("nombre de tours et total de points par défaut", () => {
    expect(rotation.nbToursParDefaut(8)).toBe(7);
    expect(rotation.nbToursParDefaut(16)).toBe(7);
    expect(rotation.pointsCibleParDefaut).toBe(24);
  });
});

describe("compteur d'inscrits d'un format à partenaires tournants", () => {
  it("affiche les exemptés quand l'effectif n'est pas un multiple de 4", () => {
    expect(libelleCompteurJoueurs(10, rotation.exemptesParTour(10, 3))).toBe("10 inscrits — 2 joueurs exemptés par tour");
    expect(libelleCompteurJoueurs(9, rotation.exemptesParTour(9, 3))).toBe("9 inscrits — 1 joueur exempté par tour");
  });

  it("n'affiche que le total quand tout le monde joue", () => {
    expect(libelleCompteurJoueurs(12, rotation.exemptesParTour(12, 3))).toBe("12 inscrits");
    expect(libelleCompteurJoueurs(1, 0)).toBe("1 inscrit");
  });
});
