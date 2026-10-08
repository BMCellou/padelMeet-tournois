import { describe, expect, it } from "vitest";
import {
  deduireAutreCamp,
  determinerVainqueurMatch,
  egalitePossibleEnPoints,
  estModePoints,
  expliquerScoreIndetermine,
  verifierSaisiePoints,
  type SetSaisi,
} from "./score";
import { normaliserFormat, resumerFormat, validerFormat } from "./formatMatch";
import { FORMAT_PAR_DEFAUT, type MatchFormat } from "./types";

const points = (o: Partial<MatchFormat> = {}): MatchFormat => ({
  ...FORMAT_PAR_DEFAUT,
  modeScore: "points",
  pointsCible: 24,
  sommeExacte: true,
  limiteTempsMin: null,
  regleFinDeTemps: "aucune",
  ...o,
});
const manche = (a: number, b: number, tbA?: number, tbB?: number): SetSaisi[] => [{ jeuxA: a, jeuxB: b, tiebreakA: tbA ?? null, tiebreakB: tbB ?? null }];

describe("arbitrage : jeux_sets strictement préservé", () => {
  const scores: SetSaisi[][] = [
    [{ jeuxA: 7, jeuxB: 3 }],
    [{ jeuxA: 5, jeuxB: 4 }],
    [{ jeuxA: 6, jeuxB: 6, tiebreakA: 7, tiebreakB: 5 }],
    [{ jeuxA: 6, jeuxB: 6 }],
    [{ jeuxA: 4, jeuxB: 4 }],
    [{ jeuxA: 4, jeuxB: 4, tiebreakA: 1, tiebreakB: 0 }],
    [{ jeuxA: 6, jeuxB: 3 }, { jeuxA: 3, jeuxB: 6 }, { jeuxA: 10, jeuxB: 8 }],
    [],
  ];
  const formats: MatchFormat[] = [
    FORMAT_PAR_DEFAUT,
    { ...FORMAT_PAR_DEFAUT, nbSetsGagnants: 2 },
    { ...FORMAT_PAR_DEFAUT, limiteTempsMin: null, regleFinDeTemps: "aucune" },
  ];

  it.each(formats.map((f, i) => [i, f] as const))("format %i : même résultat avec modeScore « jeux_sets », absent, ou points sans effet sur les sets", (_i, f) => {
    const legacy = { ...f } as Partial<MatchFormat>;
    delete legacy.modeScore;
    for (const s of scores) {
      const attendu = determinerVainqueurMatch(s, { ...f, modeScore: "jeux_sets" });
      expect(determinerVainqueurMatch(s, legacy as MatchFormat)).toEqual(attendu);
      expect(attendu.nul).toBeUndefined();
    }
    expect(estModePoints(f)).toBe(false);
    expect(estModePoints(legacy as MatchFormat)).toBe(false);
    expect(verifierSaisiePoints(scores[0], f)).toBeNull(); // sans objet en jeux/sets
  });

  it("un format enregistré avant l'ajout du mode (sans les nouveaux champs) reste valide et inchangé", () => {
    const ancien = { ...FORMAT_PAR_DEFAUT } as Partial<MatchFormat>;
    delete ancien.modeScore; delete ancien.pointsCible; delete ancien.sommeExacte;
    const r = validerFormat(ancien);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.format).toEqual(FORMAT_PAR_DEFAUT);
  });
});

describe("mode points : le vainqueur est le camp au score le plus élevé", () => {
  it("16-8 : A gagne ; 9-15 : B gagne", () => {
    expect(determinerVainqueurMatch(manche(16, 8), points({ pointsCible: 24 })).vainqueur).toBe("a");
    expect(determinerVainqueurMatch(manche(9, 15), points({ pointsCible: 24 })).vainqueur).toBe("b");
  });

  it("sans manche saisie : pas de vainqueur", () => {
    expect(determinerVainqueurMatch([], points()).vainqueur).toBeNull();
  });

  it("ignore les réglages de sets et de jeux", () => {
    const f = points({ nbSetsGagnants: 2, jeuxPourGagner: 7 });
    expect(determinerVainqueurMatch(manche(13, 11), f).vainqueur).toBe("a");
  });
});

describe("mode points : l'égalité suit sommeExacte", () => {
  it("total exact et cible PAIRE (24) : 12-12 est refusé, on propose le point en or", () => {
    const f = points({ pointsCible: 24, sommeExacte: true });
    const r = determinerVainqueurMatch(manche(12, 12), f);
    expect(r.vainqueur).toBeNull();
    expect(r.nul).toBeUndefined();
    expect(expliquerScoreIndetermine(manche(12, 12), f)).toContain("point en or");
    expect(egalitePossibleEnPoints(f)).toBe(true);
  });

  it("le point en or saisi départage l'égalité", () => {
    const f = points({ pointsCible: 24, sommeExacte: true });
    expect(determinerVainqueurMatch(manche(12, 12, 1, 0), f).vainqueur).toBe("a");
    expect(determinerVainqueurMatch(manche(12, 12, 0, 1), f).vainqueur).toBe("b");
    expect(expliquerScoreIndetermine(manche(12, 12, 1, 0), f)).toBeNull();
    // Un point en or à égalité (1-1) ne départage personne.
    expect(determinerVainqueurMatch(manche(12, 12, 1, 1), f).vainqueur).toBeNull();
  });

  it("total exact et cible IMPAIRE (21) : l'égalité est impossible, jamais de point en or à proposer", () => {
    const f = points({ pointsCible: 21, sommeExacte: true });
    expect(egalitePossibleEnPoints(f)).toBe(false);
    expect(verifierSaisiePoints(manche(10, 11), f)).toBeNull();
    expect(verifierSaisiePoints(manche(10, 10), f)).toContain("exactement 21"); // somme 20 ≠ 21
    expect(determinerVainqueurMatch(manche(11, 10), f).vainqueur).toBe("a");
  });

  it("total libre (manche limitée par le temps) : l'égalité est un match nul valide, jamais bloquante", () => {
    const f = points({ sommeExacte: false, limiteTempsMin: 15, regleFinDeTemps: "leader_gagne" });
    const r = determinerVainqueurMatch(manche(14, 14), f);
    expect(r.vainqueur).toBeNull();
    expect(r.nul).toBe(true);
    expect(expliquerScoreIndetermine(manche(14, 14), f, "manche")).toBeNull();
    // Sans phase manche, le nul est refusé (verrou structurel, voir nulStructurel.test.ts).
    expect(expliquerScoreIndetermine(manche(14, 14), f)).not.toBeNull(); // rien à corriger : le nul est accepté
    expect(egalitePossibleEnPoints(f)).toBe(false); // pas de point en or imposé
    expect(determinerVainqueurMatch(manche(15, 13), f).vainqueur).toBe("a");
  });
});

describe("mode points : saisie d'un camp, l'autre se déduit", () => {
  it("total exact : 24 - points saisis", () => {
    expect(deduireAutreCamp(16, points({ pointsCible: 24 }))).toBe(8);
    expect(deduireAutreCamp(0, points({ pointsCible: 24 }))).toBe(24);
    expect(deduireAutreCamp(24, points({ pointsCible: 24 }))).toBe(0);
  });

  it("refuse hors 0..total, non entiers, et ne déduit rien hors total exact ou hors mode points", () => {
    expect(deduireAutreCamp(25, points({ pointsCible: 24 }))).toBeNull();
    expect(deduireAutreCamp(-1, points())).toBeNull();
    expect(deduireAutreCamp(3.5, points())).toBeNull();
    expect(deduireAutreCamp(10, points({ sommeExacte: false }))).toBeNull();
    expect(deduireAutreCamp(10, FORMAT_PAR_DEFAUT)).toBeNull();
  });

  it("vérifie la cohérence d'une saisie : somme exacte, entiers positifs", () => {
    expect(verifierSaisiePoints(manche(16, 8), points({ pointsCible: 24 }))).toBeNull();
    expect(verifierSaisiePoints(manche(16, 9), points({ pointsCible: 24 }))).toBe("Le total doit valoir exactement 24 points (reçu 25).");
    expect(verifierSaisiePoints(manche(16, 9), points({ pointsCible: 24, sommeExacte: false }))).toBeNull();
    expect(verifierSaisiePoints(manche(-1, 25), points())).toContain("entiers positifs");
    expect(verifierSaisiePoints([], points())).toContain("Saisis");
  });
});

describe("format de match en mode points : normalisation, validation, résumé", () => {
  it("normalise : les réglages de sets sont sans objet, idempotent", () => {
    const n = normaliserFormat(points({ nbSetsGagnants: 2, setDecisifSuperTiebreak: true, superTiebreakPoints: 10 }));
    expect(n).toMatchObject({ nbSetsGagnants: 1, jeuDecisif: null, setDecisifSuperTiebreak: false, ecartRequis: 1 });
    expect(n.superTiebreakPoints).toBeUndefined();
    expect(normaliserFormat(n)).toEqual(n);
  });

  it("valide un format de points et refuse un total absurde", () => {
    expect(validerFormat(points({ pointsCible: 32 })).ok).toBe(true);
    expect(validerFormat(points({ pointsCible: 1 })).ok).toBe(false);
    expect(validerFormat(points({ pointsCible: 24.5 })).ok).toBe(false);
  });

  it("le résumé décrit la manche à points", () => {
    expect(resumerFormat(points({ pointsCible: 24 }))).toBe(
      "Manche à 24 points, total exact (un score saisi, l'autre se déduit), point décisif, égalité : point en or, sans limite de temps",
    );
    expect(resumerFormat(points({ pointsCible: 21 }))).not.toContain("point en or");
    expect(resumerFormat(points({ sommeExacte: false, limiteTempsMin: 15, regleFinDeTemps: "leader_gagne" }))).toContain("l'égalité est un match nul");
  });
});
