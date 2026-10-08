import { describe, expect, it } from "vitest";
import { construireDeroule, nomCourt, type EquipeBrute, type MancheBrute } from "@/lib/tournoi/deroule";

const equipe = (id: string, a: string, b: string): [string, EquipeBrute] => [id, { id, nomAffiche: `${a} / ${b}`, joueurIds: [a, b].map((n) => n.split(" ")[0].toLowerCase()) }];
const joueurs = ["Anna Martin", "Bruno Petit", "Clara Roux", "David Blanc", "Emma Noir"].map((n) => ({ id: n.split(" ")[0].toLowerCase(), nomAffiche: n }));
const equipes = new Map<string, EquipeBrute>([
  equipe("e1", "Anna Martin", "Bruno Petit"),
  equipe("e2", "Clara Roux", "David Blanc"),
  equipe("e3", "Anna Martin", "Clara Roux"),
  equipe("e4", "Bruno Petit", "Emma Noir"),
]);
const terrains = new Map([["t1", { nom: "Terrain 1", ordre: 1 }]]);
const m = (id: string, tour: number, a: string, b: string, statut = "a_venir", extra: Partial<MancheBrute> = {}): MancheBrute => ({
  id, tour, statut, terrainId: "t1", debut: null, teamAId: a, teamBId: b, winnerId: null, pointsA: null, pointsB: null, ...extra,
});

describe("écran de déroulé : regroupement par tour", () => {
  it("noms courts : prénom + initiale du nom", () => {
    expect(nomCourt("Jean-Paul Martin")).toBe("Jean-Paul M.");
    expect(nomCourt("Anna de la Tour")).toBe("Anna D.");
    expect(nomCourt("Zidane")).toBe("Zidane");
  });

  it("liste les exemptés de chaque tour et propose le premier tour non terminé", () => {
    const d = construireDeroule({
      manches: [
        m("m1", 1, "e1", "e2", "valide", { winnerId: "e1", pointsA: 14, pointsB: 10 }),
        m("m2", 2, "e3", "e4"),
      ],
      equipes,
      joueurs,
      terrains,
    });
    expect(d.tours.map((t) => [t.numero, t.exemptes, t.termine])).toEqual([
      [1, ["Emma N."], true],
      [2, ["David B."], false],
    ]);
    expect(d.tourCourant).toBe(2);
    expect(d.tours[0].manches[0]).toMatchObject({ vainqueur: "a", pointsA: 14, pointsB: 10, termine: true, equipeA: ["Anna M.", "Bruno P."] });
  });

  it("tout validé : le tour courant est le dernier", () => {
    const d = construireDeroule({
      manches: [m("m1", 1, "e1", "e2", "valide", { winnerId: "e2" }), m("m2", 2, "e3", "e4", "forfait", { winnerId: "e3" })],
      equipes,
      joueurs,
      terrains,
    });
    expect(d.tourCourant).toBe(2);
    expect(d.tours.every((t) => t.termine)).toBe(true);
    expect(d.tours[0].manches[0].vainqueur).toBe("b");
  });

  it("un nul n'a pas de vainqueur ; sans manche, aucun tour", () => {
    const d = construireDeroule({ manches: [m("m1", 1, "e1", "e2", "valide", { pointsA: 12, pointsB: 12 })], equipes, joueurs, terrains });
    expect(d.tours[0].manches[0].vainqueur).toBeNull();
    expect(construireDeroule({ manches: [], equipes, joueurs, terrains })).toEqual({ tours: [], tourCourant: 1 });
  });

  it("les manches d'un tour sont rangées par terrain", () => {
    const t2 = new Map([["t1", { nom: "Terrain 1", ordre: 1 }], ["t2", { nom: "Terrain 2", ordre: 2 }]]);
    const d = construireDeroule({
      manches: [m("deux", 1, "e3", "e4", "a_venir", { terrainId: "t2" }), m("un", 1, "e1", "e2")],
      equipes,
      joueurs,
      terrains: t2,
    });
    expect(d.tours[0].manches.map((x) => x.id)).toEqual(["un", "deux"]);
  });
});
