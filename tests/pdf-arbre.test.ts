import { describe, expect, it } from "vitest";
import { disposerArbre, nombreDeTours } from "@/lib/pdf/arbre";

const zone = { x: 36, haut: 520, largeur: 770, hauteur: 420 };

describe("disposerArbre — tableau dimensionné selon le nombre de qualifiés", () => {
  it.each([
    [2, 1, [1]],
    [4, 2, [2, 1]],
    [8, 3, [4, 2, 1]],
    [16, 4, [8, 4, 2, 1]],
    [32, 5, [16, 8, 4, 2, 1]],
  ])("%i qualifiés : %i tours, cases par tour %j", (n, tours, parTour) => {
    const d = disposerArbre(n, zone);
    expect(nombreDeTours(n)).toBe(tours);
    expect(d.nbTours).toBe(tours);
    expect(d.boites.map((c) => c.length)).toEqual(parTour);
  });

  it("garde toutes les cases dans la zone, sans chevauchement vertical dans un tour", () => {
    for (const n of [4, 8, 16, 32]) {
      const d = disposerArbre(n, zone);
      for (const colonne of d.boites) {
        for (const b of colonne) {
          expect(b.haut).toBeLessThanOrEqual(zone.haut + 0.001);
          expect(b.haut - b.hauteur).toBeGreaterThanOrEqual(zone.haut - zone.hauteur - 0.001);
          expect(b.x + b.largeur).toBeLessThanOrEqual(zone.x + zone.largeur + 0.001);
        }
        for (let i = 1; i < colonne.length; i++) {
          expect(colonne[i - 1].haut - colonne[i - 1].hauteur).toBeGreaterThanOrEqual(colonne[i].haut - 0.001);
        }
      }
    }
  });

  it("centre chaque case entre ses deux sources", () => {
    const d = disposerArbre(8, zone);
    const centre = (b: { haut: number; hauteur: number }) => b.haut - b.hauteur / 2;
    expect(centre(d.boites[1][0])).toBeCloseTo((centre(d.boites[0][0]) + centre(d.boites[0][1])) / 2);
    expect(centre(d.boites[2][0])).toBeCloseTo((centre(d.boites[1][0]) + centre(d.boites[1][1])) / 2);
  });

  it("trace 3 segments par source, soit 3 par duel (2 sources) et 1 de jonction", () => {
    // Pour chaque case de tour ≥ 1 : 2 sources × 2 segments + 1 = 5.
    expect(disposerArbre(8, zone).segments).toHaveLength((2 + 1) * 5);
  });

  it("refuse un nombre qui n'est pas une puissance de 2", () => {
    expect(() => disposerArbre(6, zone)).toThrow();
    expect(() => disposerArbre(1, zone)).toThrow();
  });
});
