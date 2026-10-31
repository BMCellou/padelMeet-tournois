// Phases auxquelles on peut donner un format propre, et verrouillage des
// modifications une fois des matchs commencés. Pur : aucun accès base.

import type { MatchFormat } from "./types";
import { validerFormat } from "./formatMatch";

// Les phases d'un tournoi dépendent de son format d'animation : c'est le format qui les
// déclare (FormatAnimation.phases, FormatAnimation.resoudrePhases). Les constantes ci-dessous
// ne décrivent que les phases du format « poules + tableau » et servent de valeur par défaut
// aux fonctions de ce fichier quand l'appelant ne fournit pas la définition d'un format.

/** Une phase à laquelle on peut donner un format de match propre. */
export interface PhaseDeFormat {
  code: string;
  libelle: string;
}

/** Code d'une phase (clé de tournaments.format_par_phase). */
export type PhaseFormat = string;

export const PHASES_FORMAT = ["poule", "quarts", "demis", "finale", "classement"] as const;

export const LIBELLES_PHASES: Record<(typeof PHASES_FORMAT)[number], string> = {
  poule: "Poules",
  quarts: "Quarts de finale",
  demis: "Demi-finales",
  finale: "Finale",
  classement: "Matchs de classement",
};

/** Phases du format « poules + tableau ». */
export const PHASES_POULES_TABLEAU: readonly PhaseDeFormat[] = PHASES_FORMAT.map((code) => ({
  code,
  libelle: LIBELLES_PHASES[code],
}));

export type FormatsParPhase = Partial<Record<string, MatchFormat>>;

export interface MatchPourPhase {
  phase: string;
  round: number;
}

/**
 * Phase de format d'un match. Les matchs de tableau se rangent par
 * rapport au dernier tour : finale, demi-finales, puis quarts (et tous
 * les tours plus en amont, d'un tableau de 16 ou plus). Les matchs pour
 * la 3e et la 5e place sont des « matchs de classement ».
 */
export function phaseDuMatch(m: MatchPourPhase, dernierTourTableau: number): PhaseFormat | null {
  if (m.phase === "poule") return "poule";
  if (m.phase === "classement" || m.phase === "classement_5e") return "classement";
  if (m.phase !== "tableau") return null;
  if (m.round >= dernierTourTableau) return "finale";
  if (m.round === dernierTourTableau - 1) return "demis";
  return "quarts";
}

export function dernierTourTableau(matchs: MatchPourPhase[]): number {
  return matchs.filter((m) => m.phase === "tableau").reduce((max, m) => Math.max(max, m.round), 0);
}

export function matchCommence(statut: string): boolean {
  return statut !== "a_venir" && statut !== "pret";
}

/** Ce qu'un format déclare de ses phases : leur liste, et comment ranger un match dans l'une d'elles. */
export interface DefinitionPhases {
  phases: readonly PhaseDeFormat[];
  /**
   * Fabrique la fonction qui range un match dans sa phase d'après l'ensemble des matchs du
   * tournoi (le dernier tour d'un tableau en dépend). Null : match hors de toute phase configurable.
   */
  resoudrePhases(matchs: MatchPourPhase[]): (m: MatchPourPhase) => string | null;
  /** Phase dont le premier match joué verrouille l'ordre de départage du classement. */
  phaseDuDepartage: string;
}

export const DEFINITION_POULES_TABLEAU: DefinitionPhases = {
  phases: PHASES_POULES_TABLEAU,
  resoudrePhases(matchs) {
    const dernier = dernierTourTableau(matchs);
    return (m) => phaseDuMatch(m, dernier);
  },
  phaseDuDepartage: "poule",
};

export interface Verrou {
  verrouille: boolean;
  raison: string | null;
}

export interface Verrous {
  defaut: Verrou;
  phases: Record<string, Verrou>;
  departage: Verrou;
}

const LIBRE: Verrou = { verrouille: false, raison: null };

export function calculerVerrous(
  matchs: (MatchPourPhase & { statut: string })[],
  phasesAvecFormatPropre: ReadonlySet<PhaseFormat>,
  definition: DefinitionPhases = DEFINITION_POULES_TABLEAU,
): Verrous {
  const phaseDe = definition.resoudrePhases(matchs);
  const libelle = (code: string) => definition.phases.find((p) => p.code === code)?.libelle ?? code;
  const commencee = new Set<string>();
  for (const m of matchs) {
    const phase = phaseDe(m);
    if (phase && matchCommence(m.statut)) commencee.add(phase);
  }

  const phases = Object.fromEntries(
    definition.phases.map(({ code }) => [
      code,
      commencee.has(code)
        ? { verrouille: true, raison: `Des matchs de « ${libelle(code)} » ont déjà été joués : leurs règles ne peuvent plus changer.` }
        : LIBRE,
    ]),
  ) as Record<string, Verrou>;

  const phaseSurDefaut = definition.phases.find((p) => commencee.has(p.code) && !phasesAvecFormatPropre.has(p.code));
  const defaut: Verrou = phaseSurDefaut
    ? {
        verrouille: true,
        raison: `Des matchs de « ${phaseSurDefaut.libelle} » ont déjà été joués avec ce format : le changer modifierait leurs règles après coup. Pour agir sur les phases à venir, donne-leur un format propre dans la section 2.`,
      }
    : LIBRE;

  const departage: Verrou = commencee.has(definition.phaseDuDepartage)
    ? {
        verrouille: true,
        raison: "Des matchs de poule ont déjà été joués : changer l'ordre de départage modifierait des classements existants.",
      }
    : LIBRE;

  return { defaut, phases, departage };
}

/** Valide un objet « format par phase » reçu du client. */
export function validerFormatsParPhase(
  brut: unknown,
  phases: readonly PhaseDeFormat[] = PHASES_POULES_TABLEAU,
): { ok: true; formats: FormatsParPhase } | { ok: false; erreurs: string[] } {
  if (!brut || typeof brut !== "object" || Array.isArray(brut)) {
    return { ok: false, erreurs: ["Requête invalide."] };
  }
  const formats: FormatsParPhase = {};
  const erreurs: string[] = [];
  for (const [cle, valeur] of Object.entries(brut)) {
    if (!phases.some((p) => p.code === cle)) {
      erreurs.push(`Phase inconnue : ${cle}.`);
      continue;
    }
    if (valeur === null || valeur === undefined) continue;
    const r = validerFormat(valeur);
    if (r.ok) formats[cle] = r.format;
    else erreurs.push(...r.erreurs.map((e) => `${phases.find((p) => p.code === cle)!.libelle} : ${e}`));
  }
  return erreurs.length > 0 ? { ok: false, erreurs } : { ok: true, formats };
}
