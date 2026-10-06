// Phases auxquelles on peut donner un format propre, et verrouillage des
// modifications une fois des matchs commencés. Pur : aucun accès base.

import type { MatchFormat } from "./types";
import { validerFormat } from "./formatMatch";

export const PHASES_FORMAT = ["poule", "quarts", "demis", "finale", "classement"] as const;
export type PhaseFormat = (typeof PHASES_FORMAT)[number];

export const LIBELLES_PHASES: Record<PhaseFormat, string> = {
  poule: "Poules",
  quarts: "Quarts de finale",
  demis: "Demi-finales",
  finale: "Finale",
  classement: "Matchs de classement",
};

export type FormatsParPhase = Partial<Record<PhaseFormat, MatchFormat>>;

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

export interface Verrou {
  verrouille: boolean;
  raison: string | null;
}

export interface Verrous {
  defaut: Verrou;
  phases: Record<PhaseFormat, Verrou>;
  departage: Verrou;
}

const LIBRE: Verrou = { verrouille: false, raison: null };

export function calculerVerrous(
  matchs: (MatchPourPhase & { statut: string })[],
  phasesAvecFormatPropre: ReadonlySet<PhaseFormat>,
): Verrous {
  const dernier = dernierTourTableau(matchs);
  const commencee = new Set<PhaseFormat>();
  for (const m of matchs) {
    const phase = phaseDuMatch(m, dernier);
    if (phase && matchCommence(m.statut)) commencee.add(phase);
  }

  const phases = Object.fromEntries(
    PHASES_FORMAT.map((p) => [
      p,
      commencee.has(p)
        ? { verrouille: true, raison: `Des matchs de « ${LIBELLES_PHASES[p]} » ont déjà été joués : leurs règles ne peuvent plus changer.` }
        : LIBRE,
    ]),
  ) as Record<PhaseFormat, Verrou>;

  const phaseSurDefaut = PHASES_FORMAT.find((p) => commencee.has(p) && !phasesAvecFormatPropre.has(p));
  const defaut: Verrou = phaseSurDefaut
    ? {
        verrouille: true,
        raison: `Des matchs de « ${LIBELLES_PHASES[phaseSurDefaut]} » ont déjà été joués avec ce format : le changer modifierait leurs règles après coup. Pour agir sur les phases à venir, donne-leur un format propre dans la section 2.`,
      }
    : LIBRE;

  const departage: Verrou = commencee.has("poule")
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
): { ok: true; formats: FormatsParPhase } | { ok: false; erreurs: string[] } {
  if (!brut || typeof brut !== "object" || Array.isArray(brut)) {
    return { ok: false, erreurs: ["Requête invalide."] };
  }
  const formats: FormatsParPhase = {};
  const erreurs: string[] = [];
  for (const [cle, valeur] of Object.entries(brut)) {
    if (!(PHASES_FORMAT as readonly string[]).includes(cle)) {
      erreurs.push(`Phase inconnue : ${cle}.`);
      continue;
    }
    if (valeur === null || valeur === undefined) continue;
    const r = validerFormat(valeur);
    if (r.ok) formats[cle as PhaseFormat] = r.format;
    else erreurs.push(...r.erreurs.map((e) => `${LIBELLES_PHASES[cle as PhaseFormat]} : ${e}`));
  }
  return erreurs.length > 0 ? { ok: false, erreurs } : { ok: true, formats };
}
