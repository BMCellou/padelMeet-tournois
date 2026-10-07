// Impact d'une correction de score de poule sur la liste des qualifiés du
// tableau final, et décision qui en découle. Pur : aucun accès base.
//
// « Liste des qualifiés » = l'ensemble des équipes qualifiées. Un simple
// échange de rang entre deux qualifiés (1er/2e d'une même poule) ne change
// pas cet ensemble : il n'est pas traité ici.

import { selectionnerQualifies, type ClassementPoule } from "./qualification";

export interface EtatQualification {
  classementsParPoule: ClassementPoule[];
  nbQualifies: number;
}

export interface DifferenceQualifies {
  modifie: boolean;
  /** Équipes qui sont qualifiées après mais pas avant. */
  entrants: string[];
  /** Équipes qui sont qualifiées avant mais plus après. */
  sortants: string[];
}

export interface ImpactQualifies extends DifferenceQualifies {
  qualifiesAvant: string[];
  qualifiesApres: string[];
}

export function comparerQualifies(avant: string[], apres: string[]): DifferenceQualifies {
  const ensembleAvant = new Set(avant);
  const ensembleApres = new Set(apres);
  const entrants = apres.filter((id) => !ensembleAvant.has(id));
  const sortants = avant.filter((id) => !ensembleApres.has(id));
  return { modifie: entrants.length > 0 || sortants.length > 0, entrants, sortants };
}

/** Compare la sélection des qualifiés avant et après une correction. */
export function impactSurQualifies(etatAvant: EtatQualification, etatApres: EtatQualification): ImpactQualifies {
  const qualifiesAvant = selectionnerQualifies(etatAvant.classementsParPoule, etatAvant.nbQualifies).qualifies;
  const qualifiesApres = selectionnerQualifies(etatApres.classementsParPoule, etatApres.nbQualifies).qualifies;
  return { ...comparerQualifies(qualifiesAvant, qualifiesApres), qualifiesAvant, qualifiesApres };
}

export type DecisionCorrection = "appliquer" | "appliquer_et_regenerer" | "refuser";

export interface ContexteTableau {
  tableauExiste: boolean;
  /** Au moins un match du tableau (ou de classement) a été joué. */
  tableauCommence: boolean;
  /** Qualifiés choisis à la main : le choix de l'organisateur prime. */
  selectionManuelle: boolean;
}

export function decisionCorrection(impact: DifferenceQualifies, contexte: ContexteTableau): DecisionCorrection {
  if (!contexte.tableauExiste || contexte.selectionManuelle || !impact.modifie) return "appliquer";
  return contexte.tableauCommence ? "refuser" : "appliquer_et_regenerer";
}

function liste(ids: string[], nom: (id: string) => string): string {
  return ids.map((id) => `« ${nom(id)} »`).join(", ");
}

export function messageRefusCorrection(impact: DifferenceQualifies, nom: (id: string) => string): string {
  const parties: string[] = [];
  if (impact.entrants.length > 0) {
    parties.push(
      `${liste(impact.entrants, nom)} ${impact.entrants.length > 1 ? "entreraient" : "entrerait"} dans le tableau`,
    );
  }
  if (impact.sortants.length > 0) {
    parties.push(
      `${liste(impact.sortants, nom)} ${impact.sortants.length > 1 ? "sortiraient" : "sortirait"} du tableau`,
    );
  }
  return `Correction refusée : elle changerait les qualifiés — ${parties.join(" et ")}. Le tableau final a déjà commencé : seul un retour en arrière manuel sur le tableau (réinitialiser ses matchs joués, de la phase la plus avancée à la plus ancienne) permet de corriger ce match de poule.`;
}

export function messageIncoherenceTableau(impact: DifferenceQualifies, nom: (id: string) => string): string {
  const parties: string[] = [];
  if (impact.entrants.length > 0) parties.push(`devraient être qualifié(e)s : ${liste(impact.entrants, nom)}`);
  if (impact.sortants.length > 0) parties.push(`ne devraient plus l'être : ${liste(impact.sortants, nom)}`);
  return `Le classement des poules et le tableau final se contredisent — ${parties.join(" ; ")}.`;
}
