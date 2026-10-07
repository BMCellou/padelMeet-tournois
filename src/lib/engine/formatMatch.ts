// Format de match : validation (partagée client/serveur), normalisation,
// résumé en français et préréglages. Pur : aucun accès base.
//
// Deux modes « un seul set » coexistent dans MatchFormat :
//  - un set classique en N jeux (éventuellement avec jeu décisif) ;
//  - un « super tie-break seul » (setDecisifSuperTiebreak = true avec
//    nbSetsGagnants = 1) : le match entier se joue en un super tie-break.
// Avec 2 sets gagnants, setDecisifSuperTiebreak remplace le 3e set par un
// super tie-break.

import { z } from "zod";
import { FORMAT_PAR_DEFAUT, type MatchFormat } from "./types";
import type { CritereDepartage } from "./classement";

export const matchFormatSchema = z
  .object({
    nbSetsGagnants: z.union([z.literal(1), z.literal(2)]),
    jeuxPourGagner: z.number().int("Nombre entier requis.").min(1).max(20),
    ecartRequis: z.number().int("Nombre entier requis.").min(1).max(10),
    pointDecisif: z.boolean(),
    choixReceveur: z.boolean(),
    jeuDecisif: z
      .object({
        actif: z.boolean(),
        declencheA: z.number().int().min(1).max(20),
        points: z.number().int().min(2).max(30),
        ecart: z.number().int().min(1).max(5),
      })
      .nullable(),
    setDecisifSuperTiebreak: z.boolean(),
    superTiebreakPoints: z.number().int().min(2).max(30).optional(),
    limiteTempsMin: z.number().int().min(1).max(240).nullable(),
    regleFinDeTemps: z.enum(["leader_gagne", "finir_le_jeu", "aucune"]),
    egaliteAuBuzzer: z.enum(["point_en_or", "jeu_decisif", "nul_interdit"]).default("point_en_or"),
    dureeEstimeeMin: z.number().int().min(1).max(240),
  })
  .superRefine((f, ctx) => {
    if (f.jeuDecisif?.actif && f.jeuDecisif.declencheA > f.jeuxPourGagner) {
      ctx.addIssue({
        code: "custom",
        path: ["jeuDecisif", "declencheA"],
        message: `Le tie-break se déclenche à ${f.jeuDecisif.declencheA}-${f.jeuDecisif.declencheA}, au-delà des ${f.jeuxPourGagner} jeux nécessaires pour gagner le set.`,
      });
    }
    if (f.ecartRequis > f.jeuxPourGagner) {
      ctx.addIssue({
        code: "custom",
        path: ["ecartRequis"],
        message: `L'écart requis (${f.ecartRequis}) dépasse le nombre de jeux pour gagner (${f.jeuxPourGagner}).`,
      });
    }
    if (f.limiteTempsMin !== null && f.regleFinDeTemps === "aucune") {
      ctx.addIssue({
        code: "custom",
        path: ["regleFinDeTemps"],
        message: "Une limite de temps exige une règle de fin de temps (le leader gagne, ou finir le jeu).",
      });
    }
    if (f.setDecisifSuperTiebreak && f.superTiebreakPoints === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["superTiebreakPoints"],
        message: "Indique le nombre de points du super tie-break.",
      });
    }
  });

/** Nettoie les champs sans objet pour que deux saisies équivalentes
 * donnent le même objet (et que rien d'inutile ne soit stocké). */
export function normaliserFormat(f: MatchFormat): MatchFormat {
  const seul = f.nbSetsGagnants === 1 && f.setDecisifSuperTiebreak;
  const points = f.setDecisifSuperTiebreak ? f.superTiebreakPoints : undefined;

  const resultat: MatchFormat = {
    ...f,
    // Un super tie-break seul se gagne aux points, avec 2 points d'écart.
    jeuxPourGagner: seul && points !== undefined ? points : f.jeuxPourGagner,
    ecartRequis: seul ? 2 : f.ecartRequis,
    pointDecisif: seul ? false : f.pointDecisif,
    choixReceveur: f.pointDecisif && !seul ? f.choixReceveur : false,
    jeuDecisif: seul ? null : f.jeuDecisif && f.jeuDecisif.actif ? f.jeuDecisif : null,
    regleFinDeTemps: f.limiteTempsMin === null ? "aucune" : f.regleFinDeTemps,
  };
  if (points === undefined) delete resultat.superTiebreakPoints;
  else resultat.superTiebreakPoints = points;
  return resultat;
}

export type ResultatValidationFormat =
  | { ok: true; format: MatchFormat }
  | { ok: false; erreurs: string[] };

/** Point d'entrée unique de validation, utilisé à l'identique par
 * l'écran (retour immédiat) et par le serveur (garde-fou). */
export function validerFormat(brut: unknown): ResultatValidationFormat {
  const parsed = matchFormatSchema.safeParse(
    brut && typeof brut === "object" ? normaliserFormat(brut as MatchFormat) : brut,
  );
  if (!parsed.success) {
    return { ok: false, erreurs: [...new Set(parsed.error.issues.map((i) => i.message))] };
  }
  return { ok: true, format: parsed.data as MatchFormat };
}

const REGLES_EGALITE: Record<MatchFormat["egaliteAuBuzzer"], string> = {
  point_en_or: "point en or",
  jeu_decisif: "jeu décisif",
  nul_interdit: "nul interdit, le scoreur désigne le vainqueur",
};

const REGLES_FIN: Record<MatchFormat["regleFinDeTemps"], string> = {
  leader_gagne: "le leader gagne",
  finir_le_jeu: "on termine le jeu en cours",
  aucune: "",
};

/** Résumé lisible du format, ex. « 1 set en 7 jeux, point décisif,
 * tie-break en 7 points à 6-6, limité à 25 min (le leader gagne) ». */
export function resumerFormat(brut: MatchFormat): string {
  const f = normaliserFormat(brut);
  const parties: string[] = [];
  const seul = f.nbSetsGagnants === 1 && f.setDecisifSuperTiebreak;

  if (seul) {
    parties.push(`Super tie-break seul : ${f.superTiebreakPoints ?? "?"} points, 2 points d'écart`);
  } else {
    const sets = f.nbSetsGagnants === 1 ? "1 set" : "2 sets";
    const ecart = f.ecartRequis > 1 ? ` (${f.ecartRequis} jeux d'écart)` : "";
    parties.push(`${sets} en ${f.jeuxPourGagner} jeux${ecart}`);
    parties.push(f.pointDecisif ? (f.choixReceveur ? "point décisif" : "point décisif (receveur imposé)") : "avantage");
    if (f.jeuDecisif?.actif) {
      const j = f.jeuDecisif;
      const ecartTb = j.ecart !== 2 ? `, ${j.ecart} point(s) d'écart` : "";
      parties.push(`tie-break en ${j.points} points à ${j.declencheA}-${j.declencheA}${ecartTb}`);
    } else {
      parties.push("sans tie-break");
    }
    if (f.nbSetsGagnants === 2 && f.setDecisifSuperTiebreak) {
      parties.push(`super tie-break de ${f.superTiebreakPoints ?? "?"} points au set décisif`);
    }
  }

  if (f.limiteTempsMin !== null) {
    const regle = REGLES_FIN[f.regleFinDeTemps];
    const egalite = `égalité : ${REGLES_EGALITE[f.egaliteAuBuzzer ?? "point_en_or"]}`;
    parties.push(`limité à ${f.limiteTempsMin} min (${regle ? `${regle}, ` : ""}${egalite})`);
  } else {
    parties.push("sans limite de temps");
  }
  return parties.join(", ");
}

export interface PrereglageFormat {
  id: string;
  libelle: string;
  format: MatchFormat;
}

export const PREREGLAGES_FORMAT: PrereglageFormat[] = [
  { id: "amical", libelle: "Tournoi amical (1 set en 7 jeux)", format: { ...FORMAT_PAR_DEFAUT } },
  {
    id: "court",
    libelle: "Format court (2 sets en 4 jeux + super tie-break)",
    format: {
      nbSetsGagnants: 2,
      jeuxPourGagner: 4,
      ecartRequis: 1,
      pointDecisif: true,
      choixReceveur: true,
      jeuDecisif: { actif: true, declencheA: 3, points: 7, ecart: 2 },
      setDecisifSuperTiebreak: true,
      superTiebreakPoints: 10,
      limiteTempsMin: null,
      regleFinDeTemps: "aucune",
      egaliteAuBuzzer: "point_en_or",
      dureeEstimeeMin: 30,
    },
  },
  {
    id: "fft_b1",
    libelle: "FFT B1 (2 sets en 6 jeux + super tie-break)",
    format: {
      nbSetsGagnants: 2,
      jeuxPourGagner: 6,
      ecartRequis: 2,
      pointDecisif: true,
      choixReceveur: true,
      jeuDecisif: { actif: true, declencheA: 6, points: 7, ecart: 2 },
      setDecisifSuperTiebreak: true,
      superTiebreakPoints: 10,
      limiteTempsMin: null,
      regleFinDeTemps: "aucune",
      egaliteAuBuzzer: "point_en_or",
      dureeEstimeeMin: 60,
    },
  },
  {
    id: "super_tiebreak",
    libelle: "Super tie-break seul",
    format: {
      nbSetsGagnants: 1,
      jeuxPourGagner: 10,
      ecartRequis: 2,
      pointDecisif: false,
      choixReceveur: false,
      jeuDecisif: null,
      setDecisifSuperTiebreak: true,
      superTiebreakPoints: 10,
      limiteTempsMin: null,
      regleFinDeTemps: "aucune",
      egaliteAuBuzzer: "point_en_or",
      dureeEstimeeMin: 10,
    },
  },
];

/** Égalité structurelle indépendante de l'ordre des clés. */
export function memeFormat(a: MatchFormat | null | undefined, b: MatchFormat | null | undefined): boolean {
  if (!a || !b) return !a && !b;
  const canon = (f: MatchFormat) => JSON.stringify(normaliserFormat(f), (_, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([x], [y]) => x.localeCompare(y)))
      : v,
  );
  return canon(a) === canon(b);
}

// ── Ordre de départage ─────────────────────────────────────────────────

export const CRITERES_DEPARTAGE: { id: CritereDepartage; libelle: string; aide: string }[] = [
  { id: "victoires", libelle: "Victoires", aide: "Nombre de matchs gagnés." },
  { id: "confrontation_directe", libelle: "Confrontation directe", aide: "Résultat du match entre les deux équipes à égalité (seulement quand elles sont exactement 2)." },
  { id: "mini_classement", libelle: "Mini-classement", aide: "Victoires entre elles des équipes à égalité (seulement quand elles sont 3 ou plus)." },
  { id: "difference_sets", libelle: "Différence de sets", aide: "Sets gagnés moins sets perdus." },
  { id: "ratio_sets", libelle: "Ratio de sets", aide: "Sets gagnés / sets joués (entre 0 et 1)." },
  { id: "difference_jeux", libelle: "Différence de jeux", aide: "Jeux gagnés moins jeux perdus." },
  { id: "ratio_jeux", libelle: "Ratio de jeux", aide: "Jeux gagnés / jeux joués (entre 0 et 1)." },
];

export const DEPARTAGE_PAR_DEFAUT: CritereDepartage[] = [
  "victoires",
  "confrontation_directe",
  "mini_classement",
  "ratio_sets",
  "ratio_jeux",
];

const IDS_CRITERES = CRITERES_DEPARTAGE.map((c) => c.id) as [CritereDepartage, ...CritereDepartage[]];

export const departageSchema = z
  .array(z.enum(IDS_CRITERES))
  .min(1, "Garde au moins un critère de départage.")
  .superRefine((criteres, ctx) => {
    if (new Set(criteres).size !== criteres.length) {
      ctx.addIssue({ code: "custom", message: "Un critère ne peut apparaître qu'une fois." });
    }
    if (criteres[0] !== "victoires") {
      ctx.addIssue({ code: "custom", message: "Les victoires doivent rester le premier critère de départage." });
    }
  });

export function validerDepartage(brut: unknown): { ok: true; criteres: CritereDepartage[] } | { ok: false; erreurs: string[] } {
  const parsed = departageSchema.safeParse(brut);
  if (!parsed.success) return { ok: false, erreurs: [...new Set(parsed.error.issues.map((i) => i.message))] };
  return { ok: true, criteres: parsed.data };
}

/** Critères actifs qui ne départageront rien (ou presque) avec ce format. */
export function avertissementsDepartage(brut: MatchFormat, criteres: CritereDepartage[]): string[] {
  const f = normaliserFormat(brut);
  const avertissements: string[] = [];
  const unSeulSet = f.nbSetsGagnants === 1;

  if (unSeulSet && criteres.includes("difference_sets")) {
    avertissements.push("« Différence de sets » ne départagera personne : avec un seul set gagnant, elle vaut +1 ou -1 pour toutes les équipes à égalité de victoires.");
  }
  if (unSeulSet && criteres.includes("ratio_sets")) {
    avertissements.push("« Ratio de sets » ne départagera personne : avec un seul set gagnant, il est identique pour toutes les équipes à égalité de victoires.");
  }
  if (f.setDecisifSuperTiebreak && (criteres.includes("difference_jeux") || criteres.includes("ratio_jeux"))) {
    avertissements.push("Les points du super tie-break sont comptés comme des jeux dans les critères de jeux : ils peuvent fausser ce départage.");
  }
  return avertissements;
}
