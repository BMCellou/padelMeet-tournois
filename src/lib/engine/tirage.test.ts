import { describe, expect, it } from "vitest";
import { tirerAuSort, type EquipeAvecSeed } from "./tirage";
import { creerRng } from "./rng";

describe("tirerAuSort", () => {
  it("respecte les tailles de poules demandées", () => {
    const equipes: EquipeAvecSeed[] = Array.from({ length: 14 }, (_, i) => ({ id: `e${i}` }));
    const resultat = tirerAuSort(equipes, [5, 5, 4], creerRng(1));
    expect(resultat.poules.map((p) => p.equipeIds.length)).toEqual([5, 5, 4]);
    expect(resultat.poules.map((p) => p.nom)).toEqual(["A", "B", "C"]);
  });

  it("place chaque équipe exactement une fois", () => {
    const equipes: EquipeAvecSeed[] = Array.from({ length: 14 }, (_, i) => ({ id: `e${i}` }));
    const resultat = tirerAuSort(equipes, [5, 5, 4], creerRng(1));
    const toutes = resultat.poules.flatMap((p) => p.equipeIds).sort();
    expect(toutes).toEqual(equipes.map((e) => e.id).sort());
  });

  it("répartit une tête de série par poule (serpentin)", () => {
    const equipes: EquipeAvecSeed[] = [
      { id: "seed1", seed: 1 },
      { id: "seed2", seed: 2 },
      { id: "seed3", seed: 3 },
      ...Array.from({ length: 11 }, (_, i) => ({ id: `n${i}` })),
    ];
    const resultat = tirerAuSort(equipes, [5, 5, 4], creerRng(1));
    // Une seule tête de série par poule : seed1 en A, seed2 en B, seed3 en C.
    expect(resultat.poules[0].equipeIds).toContain("seed1");
    expect(resultat.poules[1].equipeIds).toContain("seed2");
    expect(resultat.poules[2].equipeIds).toContain("seed3");
    for (const p of resultat.poules) {
      const nbSeeds = p.equipeIds.filter((id) => id.startsWith("seed")).length;
      expect(nbSeeds).toBe(1);
    }
  });

  it("est reproductible avec la même graine", () => {
    const equipes: EquipeAvecSeed[] = Array.from({ length: 14 }, (_, i) => ({ id: `e${i}` }));
    const a = tirerAuSort(equipes, [5, 5, 4], creerRng(2026));
    const b = tirerAuSort(equipes, [5, 5, 4], creerRng(2026));
    expect(a).toEqual(b);
  });

  it("refuse si le nombre d'équipes ne correspond pas aux tailles fournies", () => {
    const equipes: EquipeAvecSeed[] = Array.from({ length: 13 }, (_, i) => ({ id: `e${i}` }));
    expect(() => tirerAuSort(equipes, [5, 5, 4], creerRng(1))).toThrow();
  });
});
