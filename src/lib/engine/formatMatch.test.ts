import { describe, expect, it } from "vitest";
import {
  PREREGLAGES_FORMAT,
  avertissementsDepartage,
  memeFormat,
  normaliserFormat,
  resumerFormat,
  validerDepartage,
  validerFormat,
} from "./formatMatch";
import { FORMAT_PAR_DEFAUT, type MatchFormat } from "./types";

const base: MatchFormat = { ...FORMAT_PAR_DEFAUT };

describe("préréglages", () => {
  const parId = Object.fromEntries(PREREGLAGES_FORMAT.map((p) => [p.id, p.format]));

  it("propose exactement les 4 préréglages attendus", () => {
    expect(PREREGLAGES_FORMAT.map((p) => p.id)).toEqual(["amical", "court", "fft_b1", "super_tiebreak"]);
  });

  it("tournoi amical = format par défaut de l'application (1 set en 7 jeux)", () => {
    expect(parId.amical).toEqual(FORMAT_PAR_DEFAUT);
    expect(parId.amical.nbSetsGagnants).toBe(1);
    expect(parId.amical.jeuxPourGagner).toBe(7);
  });

  it("format court = 2 sets en 4 jeux + super tie-break", () => {
    expect(parId.court).toMatchObject({
      nbSetsGagnants: 2,
      jeuxPourGagner: 4,
      setDecisifSuperTiebreak: true,
      superTiebreakPoints: 10,
      jeuDecisif: { actif: true, declencheA: 3 },
    });
  });

  it("FFT B1 = 2 sets en 6 jeux + super tie-break, tie-break à 6-6", () => {
    expect(parId.fft_b1).toMatchObject({
      nbSetsGagnants: 2,
      jeuxPourGagner: 6,
      ecartRequis: 2,
      setDecisifSuperTiebreak: true,
      superTiebreakPoints: 10,
      jeuDecisif: { actif: true, declencheA: 6 },
    });
  });

  it("super tie-break seul = 1 set, aucun jeu classique", () => {
    expect(parId.super_tiebreak).toMatchObject({
      nbSetsGagnants: 1,
      setDecisifSuperTiebreak: true,
      superTiebreakPoints: 10,
      jeuDecisif: null,
    });
  });

  it.each(PREREGLAGES_FORMAT.map((p) => [p.id, p.format] as const))(
    "le préréglage %s est valide et déjà normalisé",
    (_id, format) => {
      const r = validerFormat(format);
      expect(r.ok).toBe(true);
      expect(memeFormat(format, normaliserFormat(format))).toBe(true);
      if (r.ok) expect(r.format).toEqual(format);
    },
  );
});

describe("validerFormat", () => {
  it("accepte le format par défaut", () => {
    expect(validerFormat(base).ok).toBe(true);
  });

  it("refuse un tie-break déclenché au-delà du nombre de jeux pour gagner", () => {
    const r = validerFormat({ ...base, jeuxPourGagner: 4, jeuDecisif: { actif: true, declencheA: 6, points: 7, ecart: 2 } });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erreurs.join(" ")).toContain("au-delà");
  });

  it("ignore un tie-break désactivé, même avec un seuil incohérent", () => {
    const r = validerFormat({ ...base, jeuxPourGagner: 4, jeuDecisif: { actif: false, declencheA: 9, points: 7, ecart: 2 } });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.format.jeuDecisif).toBeNull();
  });

  it("refuse un écart requis supérieur au seuil de jeux", () => {
    const r = validerFormat({ ...base, jeuxPourGagner: 3, ecartRequis: 4, jeuDecisif: null });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erreurs.join(" ")).toContain("écart requis");
  });

  it("refuse une limite de temps sans règle de fin", () => {
    const r = validerFormat({ ...base, limiteTempsMin: 25, regleFinDeTemps: "aucune" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erreurs.join(" ")).toContain("règle de fin");
  });

  it("sans limite de temps, la règle de fin est ramenée à « aucune »", () => {
    const r = validerFormat({ ...base, limiteTempsMin: null, regleFinDeTemps: "leader_gagne" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.format.regleFinDeTemps).toBe("aucune");
  });

  it("refuse un super tie-break sans nombre de points", () => {
    const r = validerFormat({ ...base, nbSetsGagnants: 2, setDecisifSuperTiebreak: true });
    expect(r.ok).toBe(false);
  });

  it("refuse les valeurs hors bornes et non entières", () => {
    expect(validerFormat({ ...base, jeuxPourGagner: 0 }).ok).toBe(false);
    expect(validerFormat({ ...base, jeuxPourGagner: 6.5 }).ok).toBe(false);
    expect(validerFormat({ ...base, nbSetsGagnants: 3 }).ok).toBe(false);
    expect(validerFormat(null).ok).toBe(false);
  });

  it("sans point décisif, le choix du receveur est remis à faux", () => {
    const r = validerFormat({ ...base, pointDecisif: false, choixReceveur: true });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.format.choixReceveur).toBe(false);
  });
});

describe("resumerFormat", () => {
  it("format par défaut", () => {
    expect(resumerFormat(base)).toBe(
      "1 set en 7 jeux, point décisif, tie-break en 7 points à 6-6, limité à 25 min (le leader gagne)",
    );
  });

  it("2 sets avec super tie-break, sans limite de temps", () => {
    const court = PREREGLAGES_FORMAT.find((p) => p.id === "court")!.format;
    expect(resumerFormat(court)).toBe(
      "2 sets en 4 jeux, point décisif, tie-break en 7 points à 3-3, super tie-break de 10 points au set décisif, sans limite de temps",
    );
  });

  it("super tie-break seul", () => {
    const st = PREREGLAGES_FORMAT.find((p) => p.id === "super_tiebreak")!.format;
    expect(resumerFormat(st)).toBe("Super tie-break seul : 10 points, 2 points d'écart, sans limite de temps");
  });

  it("avantage, sans tie-break, règle « finir le jeu »", () => {
    expect(
      resumerFormat({ ...base, pointDecisif: false, jeuDecisif: null, regleFinDeTemps: "finir_le_jeu" }),
    ).toBe("1 set en 7 jeux, avantage, sans tie-break, limité à 25 min (on termine le jeu en cours)");
  });
});

describe("départage", () => {
  it("accepte l'ordre par défaut", () => {
    expect(validerDepartage(["victoires", "confrontation_directe", "ratio_sets", "ratio_jeux"]).ok).toBe(true);
  });

  it("refuse vide, doublon, critère inconnu, et victoires qui n'est pas premier", () => {
    expect(validerDepartage([]).ok).toBe(false);
    expect(validerDepartage(["victoires", "victoires"]).ok).toBe(false);
    expect(validerDepartage(["victoires", "hasard"]).ok).toBe(false);
    expect(validerDepartage(["ratio_jeux", "victoires"]).ok).toBe(false);
  });

  it("avertit que les critères de sets ne discriminent rien avec 1 set gagnant", () => {
    const a = avertissementsDepartage(base, ["victoires", "ratio_sets", "difference_sets"]);
    expect(a).toHaveLength(2);
    expect(avertissementsDepartage({ ...base, nbSetsGagnants: 2 }, ["victoires", "ratio_sets"])).toEqual([]);
  });

  it("avertit sur les critères de jeux avec un super tie-break", () => {
    const st = PREREGLAGES_FORMAT.find((p) => p.id === "fft_b1")!.format;
    expect(avertissementsDepartage(st, ["victoires", "ratio_jeux"])).toHaveLength(1);
  });
});
