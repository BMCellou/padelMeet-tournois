import { describe, expect, it } from "vitest";
import { apparierSolos, type JoueurSolo } from "./appariement";
import { creerRng } from "./rng";

function tousLesJoueurs(equipes: [string, string][], nonApparies: string[]): string[] {
  return [...equipes.flat(), ...nonApparies].sort();
}

describe("apparierSolos — aleatoire", () => {
  it("apparie tout le monde par paires quand le nombre est pair", () => {
    const joueurs: JoueurSolo[] = Array.from({ length: 8 }, (_, i) => ({ id: `j${i}` }));
    const resultat = apparierSolos(joueurs, "aleatoire", creerRng(1));
    expect(resultat.equipes).toHaveLength(4);
    expect(resultat.joueursNonApparies).toHaveLength(0);
    expect(tousLesJoueurs(resultat.equipes, resultat.joueursNonApparies)).toEqual(
      joueurs.map((j) => j.id).sort(),
    );
  });

  it("signale le joueur impair sans le supprimer", () => {
    const joueurs: JoueurSolo[] = Array.from({ length: 7 }, (_, i) => ({ id: `j${i}` }));
    const resultat = apparierSolos(joueurs, "aleatoire", creerRng(1));
    expect(resultat.equipes).toHaveLength(3);
    expect(resultat.joueursNonApparies).toHaveLength(1);
  });

  it("est reproductible avec la même graine", () => {
    const joueurs: JoueurSolo[] = Array.from({ length: 10 }, (_, i) => ({ id: `j${i}` }));
    const a = apparierSolos(joueurs, "aleatoire", creerRng(99));
    const b = apparierSolos(joueurs, "aleatoire", creerRng(99));
    expect(a).toEqual(b);
  });
});

describe("apparierSolos — equilibre", () => {
  it("apparie le meilleur avec le moins bon (serpentin)", () => {
    const joueurs: JoueurSolo[] = [
      { id: "meilleur", niveau: 1 },
      { id: "bon", niveau: 2 },
      { id: "moyen", niveau: 3 },
      { id: "faible", niveau: 4 },
    ];
    const resultat = apparierSolos(joueurs, "equilibre", creerRng(1));
    expect(resultat.equipes).toContainEqual(["meilleur", "faible"]);
    expect(resultat.equipes).toContainEqual(["bon", "moyen"]);
    expect(resultat.joueursNonApparies).toHaveLength(0);
  });

  it("laisse le joueur du milieu non apparié si le nombre est impair", () => {
    const joueurs: JoueurSolo[] = [
      { id: "a", niveau: 1 },
      { id: "b", niveau: 2 },
      { id: "c", niveau: 3 },
    ];
    const resultat = apparierSolos(joueurs, "equilibre", creerRng(1));
    expect(resultat.equipes).toEqual([["a", "c"]]);
    expect(resultat.joueursNonApparies).toEqual(["b"]);
  });

  it("exige un niveau pour chaque joueur", () => {
    const joueurs: JoueurSolo[] = [{ id: "a", niveau: 1 }, { id: "b" }];
    expect(() => apparierSolos(joueurs, "equilibre", creerRng(1))).toThrow();
  });
});

describe("apparierSolos — mixte", () => {
  it("forme un homme + une femme par équipe", () => {
    const joueurs: JoueurSolo[] = [
      { id: "h1", sexe: "H" },
      { id: "h2", sexe: "H" },
      { id: "f1", sexe: "F" },
      { id: "f2", sexe: "F" },
    ];
    const resultat = apparierSolos(joueurs, "mixte", creerRng(1));
    expect(resultat.equipes).toHaveLength(2);
    for (const [a, b] of resultat.equipes) {
      const sexeA = joueurs.find((j) => j.id === a)!.sexe;
      const sexeB = joueurs.find((j) => j.id === b)!.sexe;
      expect([sexeA, sexeB].sort()).toEqual(["F", "H"]);
    }
    expect(resultat.joueursNonApparies).toHaveLength(0);
  });

  it("signale les joueurs du genre majoritaire en trop, sans les supprimer", () => {
    const joueurs: JoueurSolo[] = [
      { id: "h1", sexe: "H" },
      { id: "h2", sexe: "H" },
      { id: "h3", sexe: "H" },
      { id: "f1", sexe: "F" },
    ];
    const resultat = apparierSolos(joueurs, "mixte", creerRng(1));
    expect(resultat.equipes).toHaveLength(1);
    expect(resultat.joueursNonApparies).toHaveLength(2);
    expect(resultat.joueursNonApparies.every((id) => id.startsWith("h"))).toBe(true);
  });
});
