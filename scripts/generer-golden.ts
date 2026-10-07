// Régénère tests/golden/<scenario>.json en rejouant chaque scénario de référence.
//   npm run golden:update
// ATTENTION : ne jamais lancer ceci pour faire passer un test. Un écart signifie
// que le comportement du moteur a changé : c'est à comprendre, pas à effacer.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DEPARTAGES } from "../tests/fixtures/departages";
import { POULE_UNIQUE_5 } from "../tests/fixtures/poule-unique-5";
import { TOURNOI_25_JUILLET } from "../tests/fixtures/tournoi-25-juillet";
import { rejouerScenario, serialiser } from "./lib/golden";

const dossier = join(__dirname, "..", "tests", "golden");
mkdirSync(dossier, { recursive: true });

for (const scenario of [TOURNOI_25_JUILLET, POULE_UNIQUE_5, DEPARTAGES]) {
  const chemin = join(dossier, `${scenario.nom}.json`);
  writeFileSync(chemin, serialiser(rejouerScenario(scenario)));
  console.log(`écrit : ${chemin}`);
}
