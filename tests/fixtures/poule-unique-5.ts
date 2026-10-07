// Scénario de référence : 5 équipes, poule unique, 2 terrains, 5 tours avec un
// exempt par tour, classement final = classement de poule (pas de tableau).
// Mêmes paramètres que poule-unique-5.test.ts.

import type { Scenario } from "./scenario";
import { CRITERES_14, simulerMatchParNumero } from "./tournoi-25-juillet";

export const POULE_UNIQUE_5: Scenario = {
  nom: "poule-unique-5",
  equipes: Array.from({ length: 5 }, (_, i) => ({ id: `equipe${i + 1}` })),
  graineTirage: 20260725,
  heureDebut: "2026-07-25T09:00:00.000Z",
  terrains: [
    { id: "court1", ordre: 1 },
    { id: "court2", ordre: 2 },
  ],
  dureeJeuMin: 25,
  rotationMin: 5,
  reposMinMin: 15,
  criteres: CRITERES_14,
  nbQualifies: 0,
  simulerMatch: simulerMatchParNumero,
};
