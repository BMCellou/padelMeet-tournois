import { describe, expect, it } from "vitest";
import { calculerMatch5eDePoule, type EquipePouleRang } from "./classement5e";

function equipe(teamId: string, groupId: string, rang: number | null): EquipePouleRang {
  return { teamId, groupId, rang };
}

describe("calculerMatch5eDePoule", () => {
  it("oppose les deux 3es de poule quand ni l'un ni l'autre n'est qualifié", () => {
    const equipes = [
      equipe("a1", "A", 1),
      equipe("a2", "A", 2),
      equipe("a3", "A", 3),
      equipe("a4", "A", 4),
      equipe("b1", "B", 1),
      equipe("b2", "B", 2),
      equipe("b3", "B", 3),
      equipe("b4", "B", 4),
    ];
    const qualifies = new Set(["a1", "a2", "b1", "b2"]);

    expect(calculerMatch5eDePoule(equipes, qualifies)).toEqual({ teamAId: "a3", teamBId: "b3" });
  });

  it("retourne null s'il n'y a pas exactement deux poules", () => {
    const equipes = [
      equipe("a1", "A", 1),
      equipe("a2", "A", 2),
      equipe("a3", "A", 3),
      equipe("b1", "B", 1),
      equipe("b2", "B", 2),
      equipe("b3", "B", 3),
      equipe("c1", "C", 1),
      equipe("c2", "C", 2),
      equipe("c3", "C", 3),
    ];
    const qualifies = new Set(["a1", "a2", "b1", "b2", "c1", "c2"]);

    expect(calculerMatch5eDePoule(equipes, qualifies)).toBeNull();
  });

  it("retourne null si un des 3es de poule est déjà qualifié pour le tableau", () => {
    const equipes = [
      equipe("a1", "A", 1),
      equipe("a2", "A", 2),
      equipe("a3", "A", 3),
      equipe("b1", "B", 1),
      equipe("b2", "B", 2),
      equipe("b3", "B", 3),
    ];
    // Tableau de 8 : tous qualifiés, y compris les 3es.
    const qualifies = new Set(["a1", "a2", "a3", "b1", "b2", "b3"]);

    expect(calculerMatch5eDePoule(equipes, qualifies)).toBeNull();
  });

  it("retourne null si une poule n'a pas de 3e (poule de 2)", () => {
    const equipes = [equipe("a1", "A", 1), equipe("a2", "A", 2), equipe("b1", "B", 1), equipe("b2", "B", 2)];
    const qualifies = new Set(["a1", "a2", "b1", "b2"]);

    expect(calculerMatch5eDePoule(equipes, qualifies)).toBeNull();
  });
});
