// Scénario de référence « departages » : une poule unique de 7 équipes, scores
// fabriqués pour forcer chaque critère de DEPARTAGE_PAR_DEFAUT (victoires,
// confrontation directe, ratio de sets, ratio de jeux) à trancher.
//
// Ordre appliqué (DEPARTAGE_PAR_DEFAUT) : 1. victoires  2. confrontation
// directe  3. ratio de sets  4. ratio de jeux. NB : `mini_classement` n'est PAS
// dans le défaut ; il n'est donc pas exercé ici (le scénario à 14 équipes, qui
// l'inclut dans sa liste, est le seul à le couvrir).
//
// Victoires finales : equipe1 = 5 ; equipe2, equipe3, equipe4 = 4 ; equipe5,
// equipe6 = 2 ; equipe7 = 0. Chaque match se joue en un set : le vainqueur marque
// 7 jeux, le perdant la valeur du tableau ci-dessous.
//
// Égalités forcées et critère censé les exercer :
//  A. equipe1 seule en tête (5 victoires) et equipe7 seule dernière (0) :
//     VICTOIRES tranche, aucun départage nécessaire.
//  B. equipe5 / equipe6, 2 victoires chacune : seule égalité à DEUX équipes.
//     CONFRONTATION DIRECTE tranche : equipe5 a battu equipe6. Piège voulu :
//     equipe6 a un meilleur ratio de jeux (0,477 contre 0,426) ; si la
//     confrontation directe passait après les ratios, l'ordre s'inverserait.
//     Attendu : equipe5 5e, equipe6 6e.
//  C. equipe2 / equipe3 / equipe4, 4 victoires chacune : égalité à TROIS. La
//     confrontation directe est inapplicable à 3 équipes et le RATIO DE SETS ne
//     sépare personne (1 set par match : à victoires égales, ratio égal). Le
//     RATIO DE JEUX tranche : equipe2 (0,647) devant equipe3 et equipe4.
//     Attendu : equipe2 2e.
//  D. equipe3 / equipe4 : égalité PARFAITE jusqu'au dernier critère (30 jeux
//     gagnés et 26 perdus chacune, mêmes victoires, mêmes sets). Après le ratio de
//     jeux le moteur n'a plus de critère : elles restent ex æquo (rang 3 toutes
//     les deux, l'équipe suivante est 5e) et gardent l'ordre d'entrée.
//
// Comportement figé à noter : après la séparation d'un lot de 3 par le ratio de
// jeux, la confrontation directe n'est pas rejouée entre les équipes restées
// ex æquo (elle est déjà derrière dans la chaîne) — c'est le comportement actuel
// du moteur, pas nécessairement celui d'un règlement FFT.

import type { MatchTermine } from "@/lib/engine/classement";
import { DEPARTAGE_PAR_DEFAUT } from "@/lib/engine/formatMatch";
import type { Scenario } from "./scenario";

/** Clé « petit-grand » → [numéro du vainqueur, jeux du vainqueur, jeux du perdant]. */
export const RESULTATS_DEPARTAGES: Record<string, [number, number, number]> = {
  "1-2": [1, 7, 4], "1-3": [3, 7, 0], "1-4": [1, 7, 1], "1-5": [1, 7, 5], "1-6": [1, 7, 6], "1-7": [1, 7, 0],
  "2-3": [2, 7, 2], "2-4": [2, 7, 1], "2-5": [2, 7, 1], "2-6": [6, 7, 1], "2-7": [2, 7, 0],
  "3-4": [4, 7, 0], "3-5": [3, 7, 1], "3-6": [3, 7, 5], "3-7": [3, 7, 6],
  "4-5": [4, 7, 5], "4-6": [4, 7, 5], "4-7": [4, 7, 2],
  "5-6": [5, 7, 1], "5-7": [5, 7, 6],
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
