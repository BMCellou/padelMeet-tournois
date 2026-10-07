import { describe, expect, it } from "vitest";
import {
  determinerVainqueurMatch,
  determinerVainqueurSet,
  estEgaliteAuBuzzer,
  expliquerScoreIndetermine,
  libelleSet,
} from "./score";
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

describe("égalité au buzzer (4-4 au temps limite)", () => {
  const avecLimite = (egaliteAuBuzzer: MatchFormat["egaliteAuBuzzer"]): MatchFormat => ({
    ...FORMAT_PAR_DEFAUT,
    limiteTempsMin: 25,
    regleFinDeTemps: "leader_gagne",
    egaliteAuBuzzer,
  });

  it.each(["point_en_or", "jeu_decisif", "nul_interdit"] as const)(
    "règle %s : un 4-4 départagé désigne un vainqueur (le match est validable)",
    (regle) => {
      const f = avecLimite(regle);
      expect(determinerVainqueurSet({ jeuxA: 4, jeuxB: 4, tiebreakA: 1, tiebreakB: 0 }, f)).toBe("a");
      expect(determinerVainqueurSet({ jeuxA: 4, jeuxB: 4, tiebreakA: 3, tiebreakB: 7 }, f)).toBe("b");
      expect(determinerVainqueurMatch([{ jeuxA: 4, jeuxB: 4, tiebreakA: 0, tiebreakB: 1 }], f).vainqueur).toBe("b");
    },
  );

  it("un 4-4 sans départage reste indéterminé, mais l'explication dit quoi faire selon la règle", () => {
    const sets = [{ jeuxA: 4, jeuxB: 4 }];
    expect(determinerVainqueurMatch(sets, avecLimite("point_en_or")).vainqueur).toBeNull();
    expect(expliquerScoreIndetermine(sets, avecLimite("point_en_or"))).toContain("point en or");
    expect(expliquerScoreIndetermine(sets, avecLimite("jeu_decisif"))).toContain("jeu décisif");
    expect(expliquerScoreIndetermine(sets, avecLimite("nul_interdit"))).toContain("nul est impossible");
  });

  it("un départage à égalité (1-1) ne désigne personne et est expliqué", () => {
    const sets = [{ jeuxA: 4, jeuxB: 4, tiebreakA: 5, tiebreakB: 5 }];
    expect(determinerVainqueurMatch(sets, avecLimite("jeu_decisif")).vainqueur).toBeNull();
    expect(expliquerScoreIndetermine(sets, avecLimite("jeu_decisif"))).toContain("doivent différer");
  });

  it("sans limite de temps, une égalité hors tie-break n'est pas une fin de set : on continue de jouer", () => {
    const f: MatchFormat = { ...FORMAT_PAR_DEFAUT, limiteTempsMin: null, regleFinDeTemps: "aucune" };
    expect(determinerVainqueurSet({ jeuxA: 4, jeuxB: 4, tiebreakA: 1, tiebreakB: 0 }, f)).toBeNull();
    expect(expliquerScoreIndetermine([{ jeuxA: 4, jeuxB: 4 }], f)).toContain("Continuez à jouer");
  });

  it("l'égalité classique au seuil (6-6) garde son comportement et son message de tie-break", () => {
    const f = avecLimite("point_en_or");
    expect(determinerVainqueurSet({ jeuxA: 6, jeuxB: 6, tiebreakA: 7, tiebreakB: 5 }, f)).toBe("a");
    expect(expliquerScoreIndetermine([{ jeuxA: 6, jeuxB: 6 }], f)).toContain("tie-break");
    expect(estEgaliteAuBuzzer({ jeuxA: 6, jeuxB: 6 }, f)).toBe(false);
  });

  it("détecte une égalité au buzzer, pas un set vide ni un set non égal", () => {
    const f = avecLimite("point_en_or");
    expect(estEgaliteAuBuzzer({ jeuxA: 4, jeuxB: 4 }, f)).toBe(true);
    expect(estEgaliteAuBuzzer({ jeuxA: 0, jeuxB: 0 }, f)).toBe(false);
    expect(estEgaliteAuBuzzer({ jeuxA: 5, jeuxB: 4 }, f)).toBe(false);
  });

  it("un format enregistré sans la règle se comporte comme « point en or »", () => {
    const ancien = { ...FORMAT_PAR_DEFAUT } as Partial<MatchFormat>;
    delete ancien.egaliteAuBuzzer;
    expect(expliquerScoreIndetermine([{ jeuxA: 4, jeuxB: 4 }], ancien as MatchFormat)).toContain("point en or");
  });

  it("affiche lisiblement un set départagé", () => {
    expect(libelleSet({ jeuxA: 4, jeuxB: 4, tiebreakA: 1, tiebreakB: 0 })).toBe("4-4 (1-0)");
    expect(libelleSet({ jeuxA: 6, jeuxB: 7, tiebreakA: 4, tiebreakB: 7 })).toBe("6-7(4)");
    expect(libelleSet({ jeuxA: 7, jeuxB: 5 })).toBe("7-5");
  });
});
