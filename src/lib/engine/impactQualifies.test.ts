import { describe, expect, it } from "vitest";
import type { EquipeClassee } from "./classement";
import {
  comparerQualifies,
  decisionCorrection,
  impactSurQualifies,
  messageIncoherenceTableau,
  messageRefusCorrection,
  type EtatQualification,
} from "./impactQualifies";

function eq(teamId: string, rang: number, v: number, ratioSets = 1, ratioJeux = 1): EquipeClassee {
  return { teamId, rang, joues: 3, v, d: 3 - v, setsG: v, setsP: 3 - v, jeuxG: 0, jeuxP: 0, ratioSets, ratioJeux };
}

// 2 poules de 4, 4 qualifiés (les 2 premiers de chaque poule).
function etat(ordreA: string[], ordreB: string[]): EtatQualification {
  const poule = (groupId: string, ordre: string[]) => ({
    groupId,
    equipes: ordre.map((id, i) => eq(id, i + 1, 3 - i)),
  });
  return { classementsParPoule: [poule("A", ordreA), poule("B", ordreB)], nbQualifies: 4 };
}

const avant = etat(["A1", "A2", "A3", "A4"], ["B1", "B2", "B3", "B4"]);

describe("impactSurQualifies", () => {
  it("liste inchangée quand rien ne bouge", () => {
    const i = impactSurQualifies(avant, avant);
    expect(i.modifie).toBe(false);
    expect(i.entrants).toEqual([]);
    expect(i.sortants).toEqual([]);
  });

  it("cas limite : le 3e et le 4e s'échangent, aucun n'étant qualifié → liste inchangée", () => {
    const apres = etat(["A1", "A2", "A4", "A3"], ["B1", "B2", "B3", "B4"]);
    const i = impactSurQualifies(avant, apres);
    // Le classement a bien changé…
    expect(apres.classementsParPoule[0].equipes[2].teamId).toBe("A4");
    // …mais pas les qualifiés.
    expect(i.modifie).toBe(false);
  });

  it("le 2e et le 3e d'une poule s'échangent → le 3e entre, le 2e sort", () => {
    const apres = etat(["A1", "A3", "A2", "A4"], ["B1", "B2", "B3", "B4"]);
    const i = impactSurQualifies(avant, apres);
    expect(i.modifie).toBe(true);
    expect(i.entrants).toEqual(["A3"]);
    expect(i.sortants).toEqual(["A2"]);
  });

  it("un échange entre deux qualifiés (1er/2e) ne change pas l'ensemble des qualifiés", () => {
    const apres = etat(["A2", "A1", "A3", "A4"], ["B1", "B2", "B3", "B4"]);
    expect(impactSurQualifies(avant, apres).modifie).toBe(false);
  });
});

describe("comparerQualifies", () => {
  it("ignore l'ordre, nomme entrants et sortants", () => {
    expect(comparerQualifies(["a", "b", "c"], ["c", "b", "a"]).modifie).toBe(false);
    expect(comparerQualifies(["a", "b"], ["a", "x"])).toEqual({ modifie: true, entrants: ["x"], sortants: ["b"] });
  });
});

describe("decisionCorrection — les trois branches", () => {
  const change = { modifie: true, entrants: ["A3"], sortants: ["A2"] };
  const inchange = { modifie: false, entrants: [], sortants: [] };

  it("liste inchangée → correction appliquée normalement (tableau commencé ou non)", () => {
    expect(decisionCorrection(inchange, { tableauExiste: true, tableauCommence: false, selectionManuelle: false })).toBe("appliquer");
    expect(decisionCorrection(inchange, { tableauExiste: true, tableauCommence: true, selectionManuelle: false })).toBe("appliquer");
  });

  it("liste modifiée, aucun match du tableau validé → appliquée et tableau régénéré", () => {
    expect(decisionCorrection(change, { tableauExiste: true, tableauCommence: false, selectionManuelle: false })).toBe("appliquer_et_regenerer");
  });

  it("liste modifiée, au moins un match du tableau validé → refusée", () => {
    expect(decisionCorrection(change, { tableauExiste: true, tableauCommence: true, selectionManuelle: false })).toBe("refuser");
  });

  it("pas de tableau encore → correction appliquée, rien à régénérer", () => {
    expect(decisionCorrection(change, { tableauExiste: false, tableauCommence: false, selectionManuelle: false })).toBe("appliquer");
  });

  it("qualifiés choisis à la main → le choix de l'organisateur prime, correction appliquée", () => {
    expect(decisionCorrection(change, { tableauExiste: true, tableauCommence: true, selectionManuelle: true })).toBe("appliquer");
  });
});

describe("messages", () => {
  const noms: Record<string, string> = { A3: "Durand / Petit", A2: "Martin / Roux", B3: "Lopez / Diaz" };
  const nom = (id: string) => noms[id] ?? id;

  it("le refus nomme précisément les équipes qui entreraient et sortiraient, et indique le retour en arrière manuel", () => {
    const m = messageRefusCorrection({ modifie: true, entrants: ["A3"], sortants: ["A2"] }, nom);
    expect(m).toContain("« Durand / Petit » entrerait dans le tableau");
    expect(m).toContain("« Martin / Roux » sortirait du tableau");
    expect(m).toContain("retour en arrière manuel");
  });

  it("accorde au pluriel", () => {
    const m = messageRefusCorrection({ modifie: true, entrants: ["A3", "B3"], sortants: ["A2"] }, nom);
    expect(m).toContain("entreraient");
  });

  it("le bandeau d'incohérence nomme les équipes", () => {
    const m = messageIncoherenceTableau({ modifie: true, entrants: ["A3"], sortants: ["A2"] }, nom);
    expect(m).toContain("« Durand / Petit »");
    expect(m).toContain("« Martin / Roux »");
  });
});
