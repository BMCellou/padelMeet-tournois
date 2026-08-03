import { describe, expect, it } from "vitest";
import { selectionnerQualifies, type ClassementPoule } from "./qualification";
import type { EquipeClassee } from "./classement";

function equipe(partial: Partial<EquipeClassee> & { teamId: string; rang: number }): EquipeClassee {
  return {
    joues: 4,
    v: 0,
    d: 0,
    setsG: 0,
    setsP: 0,
    jeuxG: 0,
    jeuxP: 0,
    ratioSets: 0,
    ratioJeux: 0,
    ...partial,
  };
}

describe("selectionnerQualifies", () => {
  it("sélectionne les meilleurs 3es par ratio, pas par total brut (poules de tailles différentes)", () => {
    // Reproduit le scénario du §4.7 : 14 équipes, poules 5/5/4, tableau de 8.
    // Poule A (5 équipes) : son 3e a le ratio le plus faible => exclu.
    // Poule C (4 équipes, donc 3 matchs joués) : son 3e a un meilleur ratio
    // de victoires malgré moins de matchs joués => qualifié.
    const poules: ClassementPoule[] = [
      {
        groupId: "A",
        equipes: [
          equipe({ teamId: "A1", rang: 1, v: 4, joues: 4 }),
          equipe({ teamId: "A2", rang: 2, v: 3, joues: 4 }),
          equipe({ teamId: "A3", rang: 3, v: 2, joues: 4, ratioSets: 0.5, ratioJeux: 0.48 }),
          equipe({ teamId: "A4", rang: 4, v: 1, joues: 4 }),
          equipe({ teamId: "A5", rang: 5, v: 0, joues: 4 }),
        ],
      },
      {
        groupId: "B",
        equipes: [
          equipe({ teamId: "B1", rang: 1, v: 4, joues: 4 }),
          equipe({ teamId: "B2", rang: 2, v: 3, joues: 4 }),
          equipe({ teamId: "B3", rang: 3, v: 2, joues: 4, ratioSets: 0.625, ratioJeux: 0.52 }),
          equipe({ teamId: "B4", rang: 4, v: 1, joues: 4 }),
          equipe({ teamId: "B5", rang: 5, v: 0, joues: 4 }),
        ],
      },
      {
        groupId: "C",
        equipes: [
          equipe({ teamId: "C1", rang: 1, v: 3, joues: 3 }),
          equipe({ teamId: "C2", rang: 2, v: 2, joues: 3 }),
          equipe({ teamId: "C3", rang: 3, v: 2, joues: 3, ratioSets: 0.55, ratioJeux: 0.5 }),
          equipe({ teamId: "C4", rang: 4, v: 0, joues: 3 }),
        ],
      },
    ];

    const resultat = selectionnerQualifies(poules, 8);

    expect(resultat.tailleTableau).toBe(8);
    expect(resultat.qualifies).toHaveLength(8);
    expect(resultat.qualifies).toContain("A1");
    expect(resultat.qualifies).toContain("A2");
    expect(resultat.qualifies).not.toContain("A3");
    expect(resultat.qualifies).toContain("B3");
    expect(resultat.qualifies).toContain("C3");
  });

  it("plafonne la taille du tableau à la plus grande puissance de 2 disponible", () => {
    const poules: ClassementPoule[] = [
      {
        groupId: "A",
        equipes: [
          equipe({ teamId: "A1", rang: 1, v: 2, joues: 2 }),
          equipe({ teamId: "A2", rang: 2, v: 1, joues: 2 }),
          equipe({ teamId: "A3", rang: 3, v: 0, joues: 2 }),
        ],
      },
    ];
    // 3 équipes seulement : le tableau ne peut pas dépasser 2 (puissance de
    // 2 la plus grande ≤ 3), même si nb_qualifies=8.
    const resultat = selectionnerQualifies(poules, 8);
    expect(resultat.tailleTableau).toBe(2);
    expect(resultat.qualifies).toEqual(["A1", "A2"]);
  });
});
