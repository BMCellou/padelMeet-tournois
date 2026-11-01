// Changement du format d'animation d'un tournoi qui n'a pas encore commencé.
//
// Les formats à équipes (poules + tableau, poules de niveau, avec ou sans phase finale) partagent leurs
// inscriptions : on passe de l'un à l'autre librement. Un format à rotation (Americano) s'inscrit par joueur
// et construit ses équipes à chaque manche : on ne bascule pas entre les deux familles, ce serait changer
// la nature des inscriptions déjà reçues.
//
// Le tirage en poules et le calendrier dépendent du format (nombre de poules, second tour) : s'il existe,
// il est supprimé pour être refait, mais seulement sur confirmation et tant qu'aucun match n'a commencé.

import { getFormat, listerFormats, type FormatAnimation } from "@/lib/engine/formats";
import { matchCommence } from "@/lib/engine/formatPhases";

/** Statuts de tournoi pour lesquels le format peut encore changer. */
const STATUTS_MODIFIABLES = ["brouillon", "publie"];

/** Formats vers lesquels on peut basculer depuis `codeActuel` (lui-même compris), dans l'ordre du registre. */
export function formatsCompatibles(codeActuel: string): FormatAnimation[] {
  const actuel = getFormat(codeActuel);
  return listerFormats().filter((f) => !!f.rotation === !!actuel.rotation);
}

export interface EtatTournoiPourFormat {
  statut: string;
  /** Statut de chaque match du tournoi, toutes phases confondues. */
  statutsMatchs: string[];
  nbGroupes: number;
}

export interface DemandeChangementFormat {
  codeActuel: string;
  codeCible: string;
  /** Statut demandé dans le même enregistrement (modifier le tournoi le change en même temps). */
  statutDemande: string;
  etat: EtatTournoiPourFormat;
  /** L'admin a confirmé la suppression du tirage et du calendrier. */
  tirageSupprimeConfirme: boolean;
  /** Nombre de qualifiés saisi, sinon celui déjà enregistré. */
  nbQualifiesSaisi: number | null;
  nbQualifiesEnregistre: number | null;
}

export type VerdictChangementFormat =
  | { ok: false; error: string }
  | {
      ok: true;
      /** Le tirage et le calendrier existants sont à supprimer avant de changer. */
      supprimerTirage: boolean;
      /** Valeur de nb_qualifies à enregistrer (null pour un format sans tableau final). */
      nbQualifies: number | null;
    };

/** Un tirage existe dès qu'une poule ou un match est créé. */
export function aUnTirage(etat: EtatTournoiPourFormat): boolean {
  return etat.nbGroupes > 0 || etat.statutsMatchs.length > 0;
}

/** Le tournoi n'a pas commencé : statut brouillon ou publié, et aucun match entamé. */
export function tournoiNonCommence(etat: EtatTournoiPourFormat): boolean {
  return STATUTS_MODIFIABLES.includes(etat.statut) && !etat.statutsMatchs.some(matchCommence);
}

export function verifierChangementFormat(d: DemandeChangementFormat): VerdictChangementFormat {
  if (!formatsCompatibles(d.codeActuel).some((f) => f.code === d.codeCible)) {
    return {
      ok: false,
      error: "Ce changement de format n'est pas possible : l'Americano (inscriptions par joueur) et les formats à équipes ne s'échangent pas.",
    };
  }
  if (!tournoiNonCommence(d.etat) || !STATUTS_MODIFIABLES.includes(d.statutDemande)) {
    return { ok: false, error: "Le format ne peut plus changer : le tournoi a commencé." };
  }

  const supprimerTirage = aUnTirage(d.etat);
  if (supprimerTirage && !d.tirageSupprimeConfirme) {
    return {
      ok: false,
      error: "Le tirage et le calendrier existants seront supprimés pour être refaits avec le nouveau format : confirme-le pour continuer.",
    };
  }

  const cible = getFormat(d.codeCible);
  if (!cible.aUnTableauFinal) return { ok: true, supprimerTirage, nbQualifies: null };
  const nbQualifies = d.nbQualifiesSaisi ?? d.nbQualifiesEnregistre;
  if (nbQualifies === null) return { ok: false, error: "Le nombre de qualifiés est requis pour ce format." };
  return { ok: true, supprimerTirage, nbQualifies };
}
