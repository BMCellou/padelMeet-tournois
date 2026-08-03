import { describe, expect, it } from "vitest";
import { calculerRepartitionPoules } from "./poules";

describe("calculerRepartitionPoules", () => {
  const cas: Array<[number, number[]]> = [
    [5, [5]],
    [6, [6]],
    [7, [7]],
    [8, [4, 4]],
    [9, [5, 4]],
    [12, [4, 4, 4]],
    [14, [5, 5, 4]],
    [15, [5, 5, 5]],
    [16, [4, 4, 4, 4]],
    [18, [5, 5, 4, 4]],
    [20, [5, 5, 5, 5]],
    [24, [4, 4, 4, 4, 4, 4]],
  ];

  it.each(cas)("%i équipes => poules %j", (nombreEquipes, taillesAttendues) => {
    const resultat = calculerRepartitionPoules(nombreEquipes);
    expect(resultat.nombrePoules).toBe(taillesAttendues.length);
    expect([...resultat.tailles].sort((a, b) => b - a)).toEqual(
      [...taillesAttendues].sort((a, b) => b - a),
    );
  });

  it("avertit pour une poule unique de 6 ou 7 équipes", () => {
    expect(calculerRepartitionPoules(6).avertissement).toBeDefined();
    expect(calculerRepartitionPoules(7).avertissement).toBeDefined();
  });

  it("n'avertit pas pour une poule unique de 5 équipes (dans la cible)", () => {
    expect(calculerRepartitionPoules(5).avertissement).toBeUndefined();
  });

  it("refuse moins de 4 équipes", () => {
    expect(() => calculerRepartitionPoules(3)).toThrow();
  });

  it("permet à l'admin de forcer le nombre de poules", () => {
    const resultat = calculerRepartitionPoules(14, { nombrePoulesForce: 2 });
    expect(resultat.nombrePoules).toBe(2);
    expect([...resultat.tailles].sort((a, b) => b - a)).toEqual([7, 7]);
  });

  it("refuse un forçage qui violerait le minimum de 4 par poule", () => {
    expect(() => calculerRepartitionPoules(14, { nombrePoulesForce: 4 })).toThrow();
  });
});
