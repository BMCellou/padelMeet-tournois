import { describe, expect, it } from "vitest";
import { getFormat } from "./formats";
import { calculerVerrous, validerFormatsParPhase } from "./formatPhases";
import { FORMAT_PAR_DEFAUT } from "./types";

describe("les phases viennent du format, pas d'une constante", () => {
  const americano = getFormat("americano");
  const poules = getFormat("poules_tableau");

  it("validerFormatsParPhase n'accepte que les phases du format donné", () => {
    expect(validerFormatsParPhase({ manches: FORMAT_PAR_DEFAUT }, americano.phases).ok).toBe(true);
    expect(validerFormatsParPhase({ poule: FORMAT_PAR_DEFAUT }, americano.phases).ok).toBe(false);
    expect(validerFormatsParPhase({ manches: FORMAT_PAR_DEFAUT }, poules.phases).ok).toBe(false);
    const r = validerFormatsParPhase({ manches: { ...FORMAT_PAR_DEFAUT, limiteTempsMin: 10, regleFinDeTemps: "aucune" } }, americano.phases);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erreurs[0]).toContain("Manches");
  });

  it("calculerVerrous suit les phases du format : une manche jouée verrouille « Manches »", () => {
    const v = calculerVerrous([{ phase: "manche", round: 1, statut: "valide" }, { phase: "manche", round: 2, statut: "a_venir" }], new Set(), americano);
    expect(Object.keys(v.phases)).toEqual(["manches"]);
    expect(v.phases.manches.verrouille).toBe(true);
    expect(v.phases.manches.raison).toContain("Manches");
    expect(v.departage.verrouille).toBe(true);
    const libre = calculerVerrous([{ phase: "manche", round: 1, statut: "a_venir" }], new Set(), americano);
    expect(libre.phases.manches.verrouille).toBe(false);
  });

  it("poules + tableau : les verrous sont ceux d'avant (phases du format, étiquettes de la liste)", () => {
    const v = calculerVerrous([{ phase: "poule", round: 1, statut: "valide" }], new Set(), poules);
    expect(Object.keys(v.phases)).toEqual(poules.phases.map((p) => p.code));
    expect(v.phases.poule.raison).toContain("Poules");
  });
});
