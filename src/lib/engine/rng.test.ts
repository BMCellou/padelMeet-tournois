import { describe, expect, it } from "vitest";
import { creerRng, melanger } from "./rng";

describe("creerRng", () => {
  it("est déterministe : même graine => même séquence", () => {
    const a = creerRng(42);
    const b = creerRng(42);
    const suiteA = Array.from({ length: 5 }, () => a());
    const suiteB = Array.from({ length: 5 }, () => b());
    expect(suiteA).toEqual(suiteB);
  });

  it("des graines différentes donnent des séquences différentes", () => {
    const a = creerRng(1);
    const b = creerRng(2);
    expect(a()).not.toBe(b());
  });

  it("produit des valeurs dans [0, 1)", () => {
    const rng = creerRng(7);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("melanger", () => {
  it("est reproductible pour une même graine", () => {
    const elements = [1, 2, 3, 4, 5, 6, 7, 8];
    const resultatA = melanger(elements, creerRng(123));
    const resultatB = melanger(elements, creerRng(123));
    expect(resultatA).toEqual(resultatB);
  });

  it("conserve tous les éléments (permutation, pas de perte)", () => {
    const elements = [1, 2, 3, 4, 5];
    const resultat = melanger(elements, creerRng(9));
    expect([...resultat].sort()).toEqual([...elements].sort());
  });

  it("ne mute pas le tableau d'origine", () => {
    const elements = [1, 2, 3];
    const copie = [...elements];
    melanger(elements, creerRng(1));
    expect(elements).toEqual(copie);
  });
});
