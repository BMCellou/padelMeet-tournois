import { describe, expect, it } from "vitest";
import {
  NIVEAU_INCONNU,
  ORDRE_CLASSEMENT_FFT,
  classementFftReconnu,
  niveauDepuisClassementFft,
} from "./classementFft";
import { apparierSolos, type JoueurSolo } from "./appariement";
import { creerRng } from "./rng";

describe("niveauDepuisClassementFft", () => {
  it("suit l'ordre officiel, pas l'ordre alphabétique", () => {
    const melange = ["15/1", "NC", "30/5", "4/6", "40", "30/2", "5/6", "15/5", "30/1", "1/6", "15", "30", "-15", "0", "3/6", "2/6"];
    const trie = [...melange].sort((a, b) => niveauDepuisClassementFft(a) - niveauDepuisClassementFft(b));
    expect(trie).toEqual(["-15", "0", "1/6", "2/6", "3/6", "4/6", "5/6", "15", "15/1", "15/5", "30", "30/1", "30/2", "30/5", "40", "NC"]);
  });

  it("l'ordre alphabétique donnerait un résultat faux (garde-fou du test)", () => {
    expect(["30/2", "4/6"].sort()).toEqual(["30/2", "4/6"]); // « 3 » < « 4 » alphabétiquement…
    expect(niveauDepuisClassementFft("4/6")).toBeLessThan(niveauDepuisClassementFft("30/2")); // …mais 4/6 est meilleur
  });

  it("NC est tout en bas des classements reconnus, 40 juste au-dessus", () => {
    expect(niveauDepuisClassementFft("NC")).toBeGreaterThan(niveauDepuisClassementFft("40"));
    expect(niveauDepuisClassementFft("40")).toBeGreaterThan(niveauDepuisClassementFft("30/5"));
    expect(niveauDepuisClassementFft("15/1")).toBeLessThan(niveauDepuisClassementFft("30/1"));
    expect(niveauDepuisClassementFft("5/6")).toBeLessThan(niveauDepuisClassementFft("15/1"));
    expect(niveauDepuisClassementFft("-30")).toBeLessThan(niveauDepuisClassementFft("-15"));
  });

  it("tolère casse, espaces, point dans N.C. et moins typographique", () => {
    expect(niveauDepuisClassementFft(" 15 / 1 ")).toBe(niveauDepuisClassementFft("15/1"));
    expect(niveauDepuisClassementFft("nc")).toBe(niveauDepuisClassementFft("NC"));
    expect(niveauDepuisClassementFft("N.C.")).toBe(niveauDepuisClassementFft("NC"));
    expect(niveauDepuisClassementFft("−15")).toBe(niveauDepuisClassementFft("-15"));
    expect(niveauDepuisClassementFft("Promotion")).toBe(0);
  });

  it("valeur vide ou non reconnue : classée tout en bas, sans erreur", () => {
    for (const v of [null, undefined, "", "   ", "bon joueur", "P250", "1234", "30/9"]) {
      expect(niveauDepuisClassementFft(v)).toBe(NIVEAU_INCONNU);
    }
    expect(NIVEAU_INCONNU).toBeGreaterThan(niveauDepuisClassementFft("NC"));
    expect(classementFftReconnu("15/1")).toBe(true);
    expect(classementFftReconnu("bon joueur")).toBe(false);
  });

  it("l'échelle ne contient aucun doublon", () => {
    expect(new Set(ORDRE_CLASSEMENT_FFT).size).toBe(ORDRE_CLASSEMENT_FFT.length);
  });
});

describe("appariement « Équilibré » avec des classements FFT", () => {
  const joueur = (id: string, classement: string | null): JoueurSolo => ({ id, niveau: niveauDepuisClassementFft(classement) });

  it("associe le meilleur au moins bon, y compris NC et valeurs non reconnues", () => {
    const joueurs = [joueur("nc", "NC"), joueur("a", "15/1"), joueur("b", "30/2"), joueur("c", "4/6"), joueur("vide", null), joueur("d", "30/5")];
    const { equipes, joueursNonApparies } = apparierSolos(joueurs, "equilibre", creerRng(1));
    expect(joueursNonApparies).toEqual([]);
    // Du meilleur : c (4/6), a (15/1), b (30/2), d (30/5), nc, vide.
    expect(equipes).toEqual([
      ["c", "vide"],
      ["a", "nc"],
      ["b", "d"],
    ]);
  });

  it("ne lève aucune erreur quand aucun classement n'est renseigné", () => {
    const joueurs = [joueur("a", null), joueur("b", ""), joueur("c", "abc"), joueur("d", null)];
    expect(() => apparierSolos(joueurs, "equilibre", creerRng(1))).not.toThrow();
    expect(apparierSolos(joueurs, "equilibre", creerRng(1)).equipes).toHaveLength(2);
  });
});
