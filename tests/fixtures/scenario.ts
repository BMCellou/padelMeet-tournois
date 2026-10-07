// Forme commune des scénarios de référence rejoués par les tests « golden ».

import type { CritereDepartage, MatchTermine } from "@/lib/engine/classement";
import type { Court } from "@/lib/engine/planification";

export interface Scenario {
  /** Nom du fichier figé : tests/golden/<nom>.json */
  nom: string;
  equipes: { id: string; seed?: number | null }[];
  /** Graine du tirage au sort, fixée en dur. */
  graineTirage: number;
  /** ISO, fixée en dur. */
  heureDebut: string;
  terrains: Court[];
  dureeJeuMin: number;
  rotationMin: number;
  reposMinMin: number;
  criteres: CritereDepartage[];
  /** Nombre de qualifiés pour le tableau (poule unique : sans objet). */
  nbQualifies: number;
  /** Résultat déterministe d'un match (le numéro d'équipe le plus bas gagne). */
  simulerMatch: (teamAId: string, teamBId: string) => MatchTermine;
}
