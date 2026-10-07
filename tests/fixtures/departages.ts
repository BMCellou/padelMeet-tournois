// Scénario de référence « departages » : une poule unique de 7 équipes, scores
// fabriqués pour forcer les critères de DEPARTAGE_PAR_DEFAUT à trancher et pour
// exercer la chaîne RÉENTRANTE du moteur.
//
// Ordre appliqué (DEPARTAGE_PAR_DEFAUT) : 1. victoires  2. confrontation directe
// (égalité à 2)  3. mini-classement (égalité à 3 ou plus)  4. ratio de sets
// 5. ratio de jeux. Quand un critère sépare un groupe, chaque sous-groupe repart
// du premier critère : les critères déjà passés s'appliquent de nouveau.
//
// Victoires finales : equipe1 = 5 ; equipe2, 3, 4, 5 = 3 ; equipe6, 7 = 2. Chaque
// match se joue en un set : le vainqueur marque 7 jeux, le perdant la valeur du
// tableau ci-dessous.
//
// Égalités forcées, critère censé les exercer, et rang attendu :
//  A. VICTOIRES : equipe1 (5) seule en tête. Rang 1.
//  B. CONFRONTATION DIRECTE (égalité à DEUX au niveau des victoires) : equipe6 et
//     equipe7 ont 2 victoires ; equipe6 a battu equipe7. Piège voulu : equipe7 a un
//     ratio de jeux légèrement meilleur (0,419 contre 0,418) ; si la confrontation
//     directe passait après les ratios, l'ordre s'inverserait. Rangs 6 et 7.
//  C. MINI-CLASSEMENT (égalité à QUATRE : equipe2, 3, 4, 5, 3 victoires chacune) :
//     la confrontation directe est inapplicable à 4 équipes ; le mini-classement
//     compte les victoires entre elles : equipe2 en a 3 (elle bat les trois autres),
//     equipe3, 4, 5 en ont 1 chacune (cycle 3 > 4 > 5 > 3). Il sépare equipe2 du
//     reste. Piège voulu : equipe2 a le MOINS BON ratio de jeux du groupe (0,471) ;
//     sans mini-classement elle finirait dernière du groupe. Rang 2.
//  D. RATIO DE JEUX (sur les trois restantes equipe3, 4, 5, cycle sans vainqueur au
//     mini-classement ; ratio de sets égal pour tous : 1 set par match) : equipe3
//     (0,586) devant equipe4 et equipe5. Rang 3.
//  E. RÉENTRANCE : equipe4 et equipe5 ont exactement les mêmes jeux (29 gagnés, 31
//     perdus) donc le ratio de jeux ne les sépare pas ; elles forment un groupe de
//     DEUX qui repart du premier critère : la CONFRONTATION DIRECTE s'applique de
//     nouveau (equipe4 a battu equipe5). Rangs 4 et 5. Avant la réentrance, ces deux
//     équipes restaient ex æquo (rang 4 toutes les deux).
//
// Non couvert ici : l'égalité parfaite en bout de chaîne (voir classement.test.ts) et
// un ratio de sets qui tranche (il faudrait des matchs en plusieurs sets).

import type { MatchTermine } from "@/lib/engine/classement";
import { DEPARTAGE_PAR_DEFAUT } from "@/lib/engine/formatMatch";
import type { Scenario } from "./scenario";

/** Clé « petit-grand » → [numéro du vainqueur, jeux du vainqueur, jeux du perdant]. */
export const RESULTATS_DEPARTAGES: Record<string, [number, number, number]> = {
  "1-2": [1, 7, 0], "1-3": [1, 7, 6], "1-4": [1, 7, 3], "1-5": [5, 7, 5], "1-6": [1, 7, 4], "1-7": [1, 7, 1],
  "2-3": [2, 7, 5], "2-4": [2, 7, 5], "2-5": [2, 7, 6], "2-6": [6, 7, 6], "2-7": [7, 7, 6],
  "3-4": [3, 7, 0], "3-5": [5, 7, 2], "3-6": [3, 7, 2], "3-7": [3, 7, 1],
  "4-5": [4, 7, 0], "4-6": [4, 7, 5], "4-7": [4, 7, 5],
  "5-6": [5, 7, 3], "5-7": [7, 7, 2],
  "6-7": [6, 7, 5],
};

const numero = (id: string) => Number(id.replace("equipe", ""));

export function simulerMatchDepartages(teamAId: string, teamBId: string): MatchTermine {
  const na = numero(teamAId);
  const nb = numero(teamBId);
  const [vainqueur, jeuxVainqueur, jeuxPerdant] = RESULTATS_DEPARTAGES[`${Math.min(na, nb)}-${Math.max(na, nb)}`];
  const aGagne = vainqueur === na;
  return {
    teamAId,
    teamBId,
    vainqueurId: aGagne ? teamAId : teamBId,
    setsA: aGagne ? 1 : 0,
    setsB: aGagne ? 0 : 1,
    jeuxA: aGagne ? jeuxVainqueur : jeuxPerdant,
    jeuxB: aGagne ? jeuxPerdant : jeuxVainqueur,
  };
}

export const DEPARTAGES: Scenario = {
  nom: "departages",
  equipes: Array.from({ length: 7 }, (_, i) => ({ id: `equipe${i + 1}` })),
  graineTirage: 20260725,
  heureDebut: "2026-07-25T09:00:00.000Z",
  terrains: [
    { id: "court1", ordre: 1 },
    { id: "court2", ordre: 2 },
  ],
  dureeJeuMin: 25,
  rotationMin: 5,
  reposMinMin: 15,
  criteres: DEPARTAGE_PAR_DEFAUT,
  nbQualifies: 0,
  simulerMatch: simulerMatchDepartages,
};
