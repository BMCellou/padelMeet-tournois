// Logique de composition des documents (indépendante du dessin) : créneaux
// du calendrier, colonnes des feuilles de score, taille du tableau, libellés.

import { genererTours } from "@/lib/engine/tours";
import { CRITERES_DEPARTAGE, normaliserFormat, resumerFormat } from "@/lib/engine/formatMatch";
import { LIBELLES_PHASES, PHASES_FORMAT, dernierTourTableau, phaseDuMatch, type PhaseFormat } from "@/lib/engine/formatPhases";
import { libellerTableau, type LibelleMatchTableau } from "@/lib/engine/tableauLibelles";
import type { MatchFormat } from "@/lib/engine/types";
import { formatHeureParis } from "@/lib/temps";
import type { DonneesTournoi, MatchPdf } from "./types";

const FUSEAU = "Europe/Paris";

/** « samedi 16 janvier 2027 », en heure de Paris quel que soit le fuseau du serveur. */
export function dateEnLettres(dateISO: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: FUSEAU,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${dateISO}T12:00:00Z`));
}

export function majuscule(texte: string): string {
  return texte ? texte[0].toUpperCase() + texte.slice(1) : texte;
}

export function nomEquipe(d: DonneesTournoi, id: string | null): string | null {
  if (!id) return null;
  return d.equipes.find((e) => e.id === id)?.nom ?? null;
}

export function matchsFinaux(d: DonneesTournoi): MatchPdf[] {
  return d.matchs.filter((m) => m.phase !== "poule");
}

/** Étiquettes (« Quart de finale n°1 ») et provenance des équipes inconnues, par match de phase finale. */
export function libellesPhaseFinale(d: DonneesTournoi): Map<string, LibelleMatchTableau> {
  return libellerTableau(
    matchsFinaux(d).map((m) => ({
      id: m.id,
      phase: m.phase as "tableau" | "classement" | "classement_5e",
      round: m.round,
      bracketSlot: m.bracketSlot,
      nextMatchId: m.nextMatchId,
      nextSlot: m.nextSlot,
      loserNextMatchId: m.loserNextMatchId,
      loserNextSlot: m.loserNextSlot,
    })),
  );
}

export function etiquetteMatch(d: DonneesTournoi, m: MatchPdf, libelles = libellesPhaseFinale(d)): string {
  if (m.phase === "poule") {
    const poule = d.poules.find((p) => p.id === m.groupId);
    return `Poule ${poule?.nom ?? "?"}`;
  }
  return libelles.get(m.id)?.etiquette ?? "Phase finale";
}

/** Nom de l'équipe d'un côté du match, ou sa provenance (« Vainqueur du quart n°1 ») tant qu'elle est inconnue. */
export function coteMatch(d: DonneesTournoi, m: MatchPdf, cote: "a" | "b", libelles = libellesPhaseFinale(d)): string {
  const id = cote === "a" ? m.teamAId : m.teamBId;
  const nom = nomEquipe(d, id);
  if (nom) return nom;
  const l = libelles.get(m.id);
  return (cote === "a" ? l?.sourceA : l?.sourceB) ?? "À déterminer";
}

// ── Calendrier ──────────────────────────────────────────────────────────

export interface CelluleCreneau {
  courtId: string;
  etiquette: string;
  equipeA: string;
  equipeB: string;
}

export interface Creneau {
  debutISO: string;
  heure: string;
  cellules: CelluleCreneau[];
  /** « Poule A : Nom de l'équipe exempte », une entrée par poule concernée. */
  repos: string[];
}

/** Équipe exempte de chaque tour d'une poule (poule de taille impaire). */
export function exemptsParPoule(d: DonneesTournoi): Map<string, Map<number, string>> {
  const resultat = new Map<string, Map<number, string>>();
  for (const p of d.poules) {
    const parTour = new Map<number, string>();
    if (p.equipeIds.length >= 2) {
      for (const t of genererTours(p.equipeIds)) {
        if (t.exempt) parTour.set(t.numero, nomEquipe(d, t.exempt) ?? "?");
      }
    }
    resultat.set(p.id, parTour);
  }
  return resultat;
}

export function construireCreneaux(d: DonneesTournoi): Creneau[] {
  const libelles = libellesPhaseFinale(d);
  const exempts = exemptsParPoule(d);
  const parDebut = new Map<string, MatchPdf[]>();
  for (const m of d.matchs) {
    if (!m.debut || !m.courtId) continue;
    parDebut.set(m.debut, [...(parDebut.get(m.debut) ?? []), m]);
  }

  return [...parDebut.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([debutISO, matchs]) => {
      const repos: string[] = [];
      const dejaVus = new Set<string>();
      for (const m of matchs) {
        if (m.phase !== "poule" || !m.groupId) continue;
        const cle = `${m.groupId}:${m.round}`;
        if (dejaVus.has(cle)) continue;
        dejaVus.add(cle);
        const exempt = exempts.get(m.groupId)?.get(m.round);
        const poule = d.poules.find((p) => p.id === m.groupId);
        if (exempt) repos.push(`Poule ${poule?.nom ?? "?"} : ${exempt}`);
      }
      return {
        debutISO,
        heure: formatHeureParis(debutISO) ?? "",
        cellules: matchs.map((m) => ({
          courtId: m.courtId!,
          etiquette: etiquetteMatch(d, m, libelles),
          equipeA: coteMatch(d, m, "a", libelles),
          equipeB: coteMatch(d, m, "b", libelles),
        })),
        repos,
      };
    });
}

// ── Feuilles de score ───────────────────────────────────────────────────

export interface ColonneScore {
  titre: string;
  /** Nombre de cases (une par équipe). */
  cases: 2;
}

/** Cases à remplir, set par set, d'après le format (jeu décisif, super tie-break…). */
export function colonnesScore(brut: MatchFormat): ColonneScore[] {
  const f = normaliserFormat(brut);
  if (f.nbSetsGagnants === 1 && f.setDecisifSuperTiebreak) return [{ titre: "Super TB", cases: 2 }];

  const colonnes: ColonneScore[] = [];
  const nbSets = 2 * f.nbSetsGagnants - 1;
  for (let i = 1; i <= nbSets; i++) {
    if (i === nbSets && f.nbSetsGagnants === 2 && f.setDecisifSuperTiebreak) {
      colonnes.push({ titre: "Super TB", cases: 2 });
      continue;
    }
    colonnes.push({ titre: `Set ${i}`, cases: 2 });
    if (f.jeuDecisif?.actif) colonnes.push({ titre: "TB", cases: 2 });
  }
  return colonnes;
}

export function formatDuMatch(d: DonneesTournoi, m: MatchPdf): MatchFormat {
  const phase = phaseDuMatch(m, dernierTourTableau(d.matchs));
  return m.formatOverride ?? (phase ? d.tournoi.formatsParPhase[phase] : undefined) ?? d.tournoi.formatDefaut;
}

export interface GroupeFeuille {
  phase: PhaseFormat;
  titre: string;
  format: MatchFormat;
  resume: string;
  matchs: MatchPdf[];
}

/** Matchs regroupés par phase (un format = un en-tête de colonnes), dans l'ordre de jeu. */
export function groupesFeuilles(d: DonneesTournoi): GroupeFeuille[] {
  const dernier = dernierTourTableau(d.matchs);
  const ordre = (m: MatchPdf) => m.debut ?? "9999";
  const groupes: GroupeFeuille[] = [];
  for (const phase of PHASES_FORMAT) {
    const matchs = d.matchs
      .filter((m) => phaseDuMatch(m, dernier) === phase)
      .sort(
        (a, b) =>
          ordre(a).localeCompare(ordre(b)) ||
          a.round - b.round ||
          (a.bracketSlot ?? 0) - (b.bracketSlot ?? 0) ||
          (a.groupId ?? "").localeCompare(b.groupId ?? ""),
      );
    if (matchs.length === 0) continue;
    const format = formatDuMatch(d, matchs[0]);
    groupes.push({ phase, titre: LIBELLES_PHASES[phase], format, resume: resumerFormat(format), matchs });
  }
  return groupes;
}

export function libelleCriteres(d: DonneesTournoi): string {
  const noms = d.tournoi.criteres.map((id) => CRITERES_DEPARTAGE.find((c) => c.id === id)?.libelle ?? id);
  return noms.map((n, i) => `${i + 1}. ${n}`).join("   ");
}

const REGLES_EGALITE = {
  point_en_or: "point en or",
  jeu_decisif: "jeu décisif",
  nul_interdit: "nul interdit (le scoreur désigne le vainqueur)",
} as const;

/** Rappel de la règle d'égalité au buzzer, ou null si le format n'a pas de limite de temps. */
export function rappelBuzzer(format: MatchFormat): string | null {
  if (format.limiteTempsMin == null) return null;
  return `Limite de temps ${format.limiteTempsMin} min : en cas d'égalité au buzzer, ${REGLES_EGALITE[format.egaliteAuBuzzer ?? "point_en_or"]}.`;
}

// ── Tableau final ───────────────────────────────────────────────────────

function puissanceDe2Inferieure(n: number): number {
  return n < 1 ? 0 : 2 ** Math.floor(Math.log2(n));
}

/** Nombre d'équipes du tableau : celui du tableau généré s'il existe, sinon celui que les qualifiés permettront. */
export function tailleDuTableau(d: DonneesTournoi): number {
  const tableau = d.matchs.filter((m) => m.phase === "tableau");
  if (tableau.length > 0) {
    const premier = Math.min(...tableau.map((m) => m.round));
    return tableau.filter((m) => m.round === premier).length * 2;
  }
  if (d.poules.length < 2) return 0;
  const n = Math.min(d.tournoi.nbQualifies ?? 0, puissanceDe2Inferieure(d.equipes.length));
  return n >= 2 ? n : 0;
}

export function titreTour(tour: number, nbTours: number): string {
  const restant = nbTours - 1 - tour; // 0 = finale
  if (restant === 0) return "Finale";
  if (restant === 1) return "Demi-finales";
  if (restant === 2) return "Quarts de finale";
  if (restant === 3) return "8es de finale";
  return `Tour ${tour + 1}`;
}
