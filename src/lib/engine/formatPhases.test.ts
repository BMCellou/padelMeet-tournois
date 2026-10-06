import { describe, expect, it } from "vitest";
import { calculerVerrous, dernierTourTableau, phaseDuMatch, validerFormatsParPhase, type PhaseFormat } from "./formatPhases";
import { FORMAT_PAR_DEFAUT } from "./types";

const aucune = new Set<PhaseFormat>();

describe("phaseDuMatch", () => {
  it("range les matchs de tableau par rapport au dernier tour", () => {
    expect(phaseDuMatch({ phase: "tableau", round: 3 }, 3)).toBe("finale");
    expect(phaseDuMatch({ phase: "tableau", round: 2 }, 3)).toBe("demis");
    expect(phaseDuMatch({ phase: "tableau", round: 1 }, 3)).toBe("quarts");
    expect(phaseDuMatch({ phase: "tableau", round: 1 }, 4)).toBe("quarts");
  });
  it("tableau de 4 : demis puis finale, sans quarts", () => {
    expect(phaseDuMatch({ phase: "tableau", round: 1 }, 2)).toBe("demis");
    expect(phaseDuMatch({ phase: "tableau", round: 2 }, 2)).toBe("finale");
  });
  it("3e et 5e place sont des matchs de classement", () => {
    expect(phaseDuMatch({ phase: "classement", round: 2 }, 2)).toBe("classement");
    expect(phaseDuMatch({ phase: "classement_5e", round: 1 }, 2)).toBe("classement");
  });
  it("calcule le dernier tour sans compter la petite finale", () => {
    expect(dernierTourTableau([{ phase: "tableau", round: 1 }, { phase: "tableau", round: 2 }, { phase: "classement", round: 5 }])).toBe(2);
  });
});

describe("calculerVerrous", () => {
  it("rien n'est verrouillé avant le premier match", () => {
    const v = calculerVerrous([{ phase: "poule", round: 1, statut: "a_venir" }], aucune);
    expect(v.defaut.verrouille).toBe(false);
    expect(v.departage.verrouille).toBe(false);
    expect(Object.values(v.phases).every((p) => !p.verrouille)).toBe(true);
  });

  it("verrouille les poules, le défaut qu'elles utilisent et le départage dès un match joué", () => {
    const v = calculerVerrous(
      [
        { phase: "poule", round: 1, statut: "valide" },
        { phase: "poule", round: 2, statut: "a_venir" },
      ],
      aucune,
    );
    expect(v.phases.poule.verrouille).toBe(true);
    expect(v.phases.poule.raison).toContain("Poules");
    expect(v.defaut.verrouille).toBe(true);
    expect(v.defaut.raison).toContain("section 2");
    expect(v.departage.verrouille).toBe(true);
    // Les phases pas encore commencées restent modifiables.
    expect(v.phases.demis.verrouille).toBe(false);
    expect(v.phases.finale.verrouille).toBe(false);
  });

  it("le format par défaut reste modifiable si la phase commencée a un format propre", () => {
    const v = calculerVerrous([{ phase: "poule", round: 1, statut: "valide" }], new Set<PhaseFormat>(["poule"]));
    expect(v.defaut.verrouille).toBe(false);
    expect(v.phases.poule.verrouille).toBe(true);
  });

  it("un score saisi mais pas validé compte comme commencé ; « prêt » non", () => {
    expect(calculerVerrous([{ phase: "poule", round: 1, statut: "saisi" }], aucune).phases.poule.verrouille).toBe(true);
    expect(calculerVerrous([{ phase: "poule", round: 1, statut: "pret" }], aucune).phases.poule.verrouille).toBe(false);
  });

  it("une demi-finale jouée verrouille les demis mais ni la finale ni le départage", () => {
    const v = calculerVerrous(
      [
        { phase: "tableau", round: 1, statut: "valide" },
        { phase: "tableau", round: 2, statut: "a_venir" },
      ],
      aucune,
    );
    expect(v.phases.demis.verrouille).toBe(true);
    expect(v.phases.finale.verrouille).toBe(false);
    expect(v.departage.verrouille).toBe(false);
  });
});

describe("validerFormatsParPhase", () => {
  it("accepte des formats valides et ignore les phases à null", () => {
    const r = validerFormatsParPhase({ poule: null, finale: FORMAT_PAR_DEFAUT });
    expect(r.ok).toBe(true);
    if (r.ok) expect(Object.keys(r.formats)).toEqual(["finale"]);
  });
  it("refuse une phase inconnue et un format incohérent, en nommant la phase", () => {
    expect(validerFormatsParPhase({ barrage: FORMAT_PAR_DEFAUT }).ok).toBe(false);
    const r = validerFormatsParPhase({ demis: { ...FORMAT_PAR_DEFAUT, limiteTempsMin: 20, regleFinDeTemps: "aucune" } });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erreurs[0]).toContain("Demi-finales");
  });
});
