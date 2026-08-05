import { describe, expect, it } from "vitest";
import { determinerVainqueurMatch, determinerVainqueurSet } from "./score";
import { FORMAT_PAR_DEFAUT, type MatchFormat } from "./types";

describe("determinerVainqueurSet — format par défaut (1 set en 7 jeux, tie-break à 6-6)", () => {
  it("un score net désigne un vainqueur", () => {
    expect(determinerVainqueurSet({ jeuxA: 7, jeuxB: 3 }, FORMAT_PAR_DEFAUT)).toBe("a");
    expect(determinerVainqueurSet({ jeuxA: 2, jeuxB: 7 }, FORMAT_PAR_DEFAUT)).toBe("b");
  });

  it("un score au buzzer (leader_gagne) sans seuil atteint reste valide", () => {
    expect(determinerVainqueurSet({ jeuxA: 5, jeuxB: 4 }, FORMAT_PAR_DEFAUT)).toBe("a");
  });

  it("6-6 avec tie-break tranché désigne le vainqueur du tie-break", () => {
    expect(
      determinerVainqueurSet({ jeuxA: 6, jeuxB: 6, tiebreakA: 7, tiebreakB: 5 }, FORMAT_PAR_DEFAUT),
    ).toBe("a");
    expect(
      determinerVainqueurSet({ jeuxA: 6, jeuxB: 6, tiebreakA: 4, tiebreakB: 7 }, FORMAT_PAR_DEFAUT),
    ).toBe("b");
  });

  it("6-6 sans tie-break saisi est indéterminé", () => {
    expect(determinerVainqueurSet({ jeuxA: 6, jeuxB: 6 }, FORMAT_PAR_DEFAUT)).toBeNull();
  });

  it("6-6 avec tie-break à égalité est indéterminé", () => {
    expect(
      determinerVainqueurSet({ jeuxA: 6, jeuxB: 6, tiebreakA: 6, tiebreakB: 6 }, FORMAT_PAR_DEFAUT),
    ).toBeNull();
  });

  it("une égalité de jeux sans tie-break actif est indéterminée", () => {
    const format: MatchFormat = { ...FORMAT_PAR_DEFAUT, jeuDecisif: null };
    expect(determinerVainqueurSet({ jeuxA: 5, jeuxB: 5 }, format)).toBeNull();
  });
});

describe("determinerVainqueurMatch", () => {
  it("1 set sec : le vainqueur du set unique gagne le match", () => {
    const resultat = determinerVainqueurMatch([{ jeuxA: 7, jeuxB: 5 }], FORMAT_PAR_DEFAUT);
    expect(resultat).toEqual({ vainqueur: "a", setsGagnesA: 1, setsGagnesB: 0 });
  });

  it("match incomplet (set indéterminé) : pas de vainqueur", () => {
    const resultat = determinerVainqueurMatch([{ jeuxA: 6, jeuxB: 6 }], FORMAT_PAR_DEFAUT);
    expect(resultat.vainqueur).toBeNull();
  });

  it("meilleur des 3 sets (nbSetsGagnants=2) : 2 sets suffisent", () => {
    const format: MatchFormat = { ...FORMAT_PAR_DEFAUT, nbSetsGagnants: 2, jeuxPourGagner: 6 };
    const resultat = determinerVainqueurMatch(
      [
        { jeuxA: 6, jeuxB: 3 },
        { jeuxA: 4, jeuxB: 6 },
        { jeuxA: 6, jeuxB: 2 },
      ],
      format,
    );
    expect(resultat).toEqual({ vainqueur: "a", setsGagnesA: 2, setsGagnesB: 1 });
  });

  it("meilleur des 3 sets : 1 set à 1 ne détermine encore rien", () => {
    const format: MatchFormat = { ...FORMAT_PAR_DEFAUT, nbSetsGagnants: 2, jeuxPourGagner: 6 };
    const resultat = determinerVainqueurMatch(
      [
        { jeuxA: 6, jeuxB: 3 },
        { jeuxA: 4, jeuxB: 6 },
      ],
      format,
    );
    expect(resultat.vainqueur).toBeNull();
  });
});
