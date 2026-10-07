// Filet de non-régression du moteur : rejoue chaque scénario de référence de
// bout en bout et compare l'état final au fichier figé tests/golden/<nom>.json.
// Un écart signifie que le comportement a changé. Ne régénère jamais ces
// fichiers pour faire passer le test (voir CLAUDE.md).

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ORDRE_RACINE, premierEcart, rejouerScenario, serialiser } from "../scripts/lib/golden";
import { DEPARTAGES } from "./fixtures/departages";
import { POULE_UNIQUE_5 } from "./fixtures/poule-unique-5";
import { TOURNOI_25_JUILLET } from "./fixtures/tournoi-25-juillet";

describe.each([TOURNOI_25_JUILLET, POULE_UNIQUE_5, DEPARTAGES])("golden : $nom", (scenario) => {
  const chemin = join(__dirname, "golden", `${scenario.nom}.json`);

  it("le rejeu est strictement déterministe (deux exécutions identiques)", () => {
    expect(serialiser(rejouerScenario(scenario))).toBe(serialiser(rejouerScenario(scenario)));
  });

  it("l'état final correspond exactement au fichier figé", () => {
    expect(existsSync(chemin), `Fichier figé absent : ${chemin}`).toBe(true);
    const attendu = JSON.parse(readFileSync(chemin, "utf-8"));
    const obtenu = JSON.parse(serialiser(rejouerScenario(scenario)));
    const ecart = premierEcart(attendu, obtenu);
    expect(
      ecart,
      `Le comportement du moteur a changé pour « ${scenario.nom} » — premier écart : ${ecart}\n` +
        "Ne régénère pas les fichiers golden pour faire passer le test : comprends d'abord le changement.",
    ).toBeNull();
  });
});

describe("ordre des clés : celui du pipeline, pas l'alphabet", () => {
  it.each([TOURNOI_25_JUILLET, POULE_UNIQUE_5, DEPARTAGES])("$nom : les clés racine suivent ORDRE_RACINE", (scenario) => {
    const cles = Object.keys(JSON.parse(serialiser(rejouerScenario(scenario))));
    expect(cles).toEqual(ORDRE_RACINE.filter((c) => cles.includes(c)));
  });

  it("les qualifiés et le tableau précèdent le classement final et les cumuls", () => {
    const cles = Object.keys(JSON.parse(serialiser(rejouerScenario(TOURNOI_25_JUILLET))));
    const rang = (c: string) => cles.indexOf(c);
    expect(rang("classementsPoule")).toBeLessThan(rang("qualification"));
    expect(rang("qualification")).toBeLessThan(rang("tableau"));
    expect(rang("tableau")).toBeLessThan(rang("matchTroisiemePlace"));
    expect(rang("matchTroisiemePlace")).toBeLessThan(rang("classementFinal"));
    expect(rang("classementFinal")).toBeLessThan(rang("cumulJeuxGagnes"));
  });

  it("premierEcart parcourt les clés dans l'ordre du fichier, pas alphabétiquement", () => {
    const attendu = { zebre: 1, alpha: 1 };
    expect(premierEcart(attendu, { zebre: 2, alpha: 2 })).toBe("$.zebre : attendu 1, obtenu 2");
  });
});

describe("premierEcart", () => {
  it("renvoie null pour deux valeurs identiques", () => {
    expect(premierEcart({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })).toBeNull();
  });

  it("nomme le premier écart avec son chemin", () => {
    expect(premierEcart({ a: [1, { b: 2 }] }, { a: [1, { b: 3 }] })).toBe("$.a[1].b : attendu 2, obtenu 3");
    expect(premierEcart({ a: [1, 2] }, { a: [1] })).toBe("$.a[1] : élément manquant (attendu 2)");
    expect(premierEcart({ a: 1 }, { a: 1, b: 2 })).toBe("$.b : clé en trop (obtenu 2)");
    expect(premierEcart({ a: 1, b: 2 }, { a: 1 })).toBe("$.b : clé manquante (attendu 2)");
  });
});
