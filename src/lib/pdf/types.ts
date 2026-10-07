// Données nécessaires aux documents PDF (dossier d'organisation, résultats).
// Objets simples, indépendants de la base : le chargement est dans charger.ts,
// le dessin dans dossier.ts / resultats.ts.

import type { CritereDepartage } from "@/lib/engine/classement";
import type { SetSaisi } from "@/lib/engine/score";
import type { MatchFormat } from "@/lib/engine/types";
import type { FormatsParPhase } from "@/lib/engine/formatPhases";

export interface EquipePdf {
  id: string;
  /** Nom affiché de l'équipe (« Prénom Nom / Prénom Nom »). */
  nom: string;
  /** Noms complets des joueurs, « Prénom Nom ». */
  joueurs: string[];
}

export interface PoulePdf {
  id: string;
  nom: string;
  /** Dans l'ordre du tirage. */
  equipeIds: string[];
}

export interface MatchPdf {
  id: string;
  phase: "poule" | "tableau" | "classement" | "classement_5e";
  groupId: string | null;
  round: number;
  bracketSlot: number | null;
  statut: string;
  teamAId: string | null;
  teamBId: string | null;
  winnerId: string | null;
  courtId: string | null;
  /** ISO, ou null si non planifié. */
  debut: string | null;
  formatOverride: MatchFormat | null;
  sets: SetSaisi[];
  nextMatchId: string | null;
  nextSlot: "a" | "b" | null;
  loserNextMatchId: string | null;
  loserNextSlot: "a" | "b" | null;
}

export interface ClassementPdf {
  groupId: string;
  teamId: string;
  joues: number;
  v: number;
  d: number;
  setsG: number;
  setsP: number;
  jeuxG: number;
  jeuxP: number;
  ratioSets: number | null;
  ratioJeux: number | null;
  rang: number | null;
}

export interface DonneesTournoi {
  tournoi: {
    nom: string;
    /** AAAA-MM-JJ */
    date: string;
    statut: string;
    genre: string | null;
    niveau: string | null;
    nbQualifies: number | null;
    formatDefaut: MatchFormat;
    formatsParPhase: FormatsParPhase;
    criteres: CritereDepartage[];
    dureeMatchMin: number;
  };
  club: { nom: string; ville: string | null } | null;
  terrains: { id: string; nom: string }[];
  equipes: EquipePdf[];
  poules: PoulePdf[];
  matchs: MatchPdf[];
  classements: ClassementPdf[];
}
