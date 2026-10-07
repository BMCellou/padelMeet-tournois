// Format Americano : unité de classement le JOUEUR, calendrier statique (toutes les
// manches de la journée générées d'avance), partenaire tournant, score en POINTS,
// pas de tableau final (docs/formats-animation.md §3, §4.3 à §4.5).
//
// Chaque manche oppose deux binômes éphémères (teams.ephemere = true, tour_origine
// renseigné) : c'est un match normal, la saisie de score, l'audit et le temps réel
// existants s'appliquent tels quels. Le classement est individuel : chacun cumule les
// points marqués par son camp, indépendamment de son partenaire.
//
// Pur : aucun accès base, aucune horloge.

import { genererRotation, exemptesParTour, mancheParTour, SEUIL_AVERTISSEMENT_JOUEURS } from "./americanoRotation";
import type {
  CritereJoueur,
  EquipeEphemere,
  EtatTournoi,
  FormatAnimation,
  LigneClassement,
  MatchEtat,
  MatchPrevu,
  ModeClassementJoueurs,
  Tour,
  Validation,
} from "./types";

export { genererRotation } from "./americanoRotation";

/** Ordre de départage par défaut du classement individuel (docs/formats-animation.md §4.4). */
export const CRITERES_JOUEURS_PAR_DEFAUT: CritereJoueur[] = [
  "points_marques",
  "difference",
  "victoires",
  "confrontation_directe",
  "moins_exemptions",
];

/** Nombre de tours proposé par défaut : un partenaire différent à chaque tour, dans la limite de 7. */
export function nbToursParDefaut(nbJoueurs: number): number {
  return Math.max(1, Math.min(nbJoueurs - 1, 7));
}

// ── Classement individuel ───────────────────────────────────────────────

export interface MancheJouee {
  tour: number;
  /** Joueurs de chaque camp. */
  campA: [string, string];
  campB: [string, string];
  pointsA: number;
  pointsB: number;
  /** « a », « b », ou null pour un match nul. */
  vainqueur: "a" | "b" | null;
}

export interface LigneJoueur {
  joueurId: string;
  mancheJouees: number;
  victoires: number;
  pointsMarques: number;
  pointsEncaisses: number;
  difference: number;
  toursExempt: number;
  pointsParManche: number;
  rang: number;
}

/** Quotient borné : jamais Infinity ni NaN (aucune manche jouée = 0). */
function parManche(valeur: number, manches: number): number {
  return manches > 0 ? valeur / manches : 0;
}

function valeurCritere(l: Omit<LigneJoueur, "rang">, critere: CritereJoueur, mode: ModeClassementJoueurs): number | null {
  switch (critere) {
    case "points_marques":
      return mode === "par_manche" ? l.pointsParManche : l.pointsMarques;
    case "difference":
      return mode === "par_manche" ? parManche(l.difference, l.mancheJouees) : l.difference;
    case "victoires":
      return l.victoires;
    case "moins_exemptions":
      return -l.toursExempt;
    default:
      return null; // confrontation_directe : traitée à part
  }
}

/** Victoires de X contre Y dans les manches où ils étaient adversaires. */
function victoiresEntre(x: string, y: string, manches: MancheJouee[]): number {
  let v = 0;
  for (const m of manches) {
    const xA = m.campA.includes(x);
    const xB = m.campB.includes(x);
    const yA = m.campA.includes(y);
    const yB = m.campB.includes(y);
    if ((xA && yB) || (xB && yA)) {
      if ((xA && m.vainqueur === "a") || (xB && m.vainqueur === "b")) v++;
    }
  }
  return v;
}

type LigneSansRang = Omit<LigneJoueur, "rang">;

/**
 * Départage réentrant, comme celui des poules : dès qu'un critère sépare un groupe, chaque
 * sous-groupe repart du premier critère. La confrontation directe n'a de sens qu'entre deux joueurs.
 */
function departager(
  groupe: LigneSansRang[],
  criteres: CritereJoueur[],
  mode: ModeClassementJoueurs,
  manches: MancheJouee[],
): LigneSansRang[][] {
  if (groupe.length <= 1) return [groupe];
  for (const critere of criteres) {
    let valeurs: Map<string, number>;
    if (critere === "confrontation_directe") {
      if (groupe.length !== 2) continue;
      const [x, y] = groupe;
      valeurs = new Map([
        [x.joueurId, victoiresEntre(x.joueurId, y.joueurId, manches)],
        [y.joueurId, victoiresEntre(y.joueurId, x.joueurId, manches)],
      ]);
    } else {
      valeurs = new Map(groupe.map((l) => [l.joueurId, valeurCritere(l, critere, mode)!]));
    }
    const parValeur = new Map<number, LigneSansRang[]>();
    for (const l of groupe) {
      const v = valeurs.get(l.joueurId)!;
      parValeur.set(v, [...(parValeur.get(v) ?? []), l]);
    }
    if (parValeur.size === 1) continue;
    return [...parValeur.entries()]
      .sort((a, b) => b[0] - a[0])
      .flatMap(([, g]) => departager(g, criteres, mode, manches));
  }
  return [groupe];
}

/**
 * Classement individuel d'après les manches validées. `toursJoues` = numéros des tours existants :
 * un joueur absent d'un tour qui a eu lieu y était exempté.
 */
export function classerJoueurs(
  joueurIds: string[],
  manches: MancheJouee[],
  toursJoues: number[],
  criteres: CritereJoueur[] = CRITERES_JOUEURS_PAR_DEFAUT,
  mode: ModeClassementJoueurs = "total",
): LigneJoueur[] {
  const lignes: LigneSansRang[] = joueurIds.map((id) => {
    let mancheJouees = 0;
    let victoires = 0;
    let marques = 0;
    let encaisses = 0;
    const toursDuJoueur = new Set<number>();
    for (const m of manches) {
      const camp = m.campA.includes(id) ? "a" : m.campB.includes(id) ? "b" : null;
      if (!camp) continue;
      mancheJouees++;
      toursDuJoueur.add(m.tour);
      marques += camp === "a" ? m.pointsA : m.pointsB;
      encaisses += camp === "a" ? m.pointsB : m.pointsA;
      if (m.vainqueur === camp) victoires++;
    }
    return {
      joueurId: id,
      mancheJouees,
      victoires,
      pointsMarques: marques,
      pointsEncaisses: encaisses,
      difference: marques - encaisses,
      toursExempt: toursJoues.filter((t) => !toursDuJoueur.has(t)).length,
      pointsParManche: parManche(marques, mancheJouees),
    };
  });

  // Tri initial par le premier critère pour que l'ordre de sortie soit stable ; le départage fait le reste.
  const groupes = departager(lignes, criteres, mode, manches);
  const resultat: LigneJoueur[] = [];
  let rang = 1;
  for (const g of groupes) {
    for (const l of g) resultat.push({ ...l, rang });
    rang += g.length;
  }
  return resultat;
}

// ── Passage état → manches jouées ───────────────────────────────────────

function manchesDeLEtat(etat: EtatTournoi): MancheJouee[] {
  const equipes = new Map<string, EquipeEphemere>((etat.equipesEphemeres ?? []).map((e) => [e.id, e]));
  const resultat: MancheJouee[] = [];
  for (const m of etat.matchs) {
    if (m.phase !== "manche" || !m.termine || !m.resultat || !m.teamAId || !m.teamBId) continue;
    const a = equipes.get(m.teamAId);
    const b = equipes.get(m.teamBId);
    if (!a || !b) continue;
    resultat.push({
      tour: m.tour,
      campA: a.joueurIds,
      campB: b.joueurIds,
      pointsA: m.resultat.jeuxA,
      pointsB: m.resultat.jeuxB,
      vainqueur: m.vainqueurId === m.teamAId ? "a" : m.vainqueurId === m.teamBId ? "b" : null,
    });
  }
  return resultat;
}

function toursExistants(matchs: MatchEtat[]): number[] {
  return [...new Set(matchs.filter((m) => m.phase === "manche").map((m) => m.tour))].sort((a, b) => a - b);
}

// ── Le format ───────────────────────────────────────────────────────────

export const americano: FormatAnimation = {
  code: "americano",
  nom: "Americano",
  description:
    "À chaque tour on change de partenaire et d'adversaires. Chaque manche se joue à un total de points fixe ; chacun cumule les points marqués par son camp. Classement individuel, personne n'est éliminé.",

  uniteClassement: "joueur",
  calendrier: "statique",
  partenaire: "tournant",
  modeScore: "points",
  aUnTableauFinal: false,

  phases: [{ code: "manches", libelle: "Manches" }],
  resoudrePhases: () => (m) => (m.phase === "manche" ? "manches" : null),
  phaseDuDepartage: "manches",

  validerEffectif(n: number, terrains: number): Validation {
    if (terrains < 1) return { ok: false, message: "Au moins un terrain est nécessaire pour un Americano." };
    if (n < 4) return { ok: false, message: `Au moins 4 joueurs sont nécessaires pour un Americano (reçu ${n}).` };

    const avertissements: string[] = [];
    const exemptes = exemptesParTour(n, terrains);
    if (exemptes > 0) {
      avertissements.push(
        `${n} inscrits — ${exemptes} joueur${exemptes > 1 ? "s seront exemptés" : " sera exempté"} à chaque tour.`,
      );
    }
    if (n > SEUIL_AVERTISSEMENT_JOUEURS) {
      avertissements.push(
        `Au-delà de ${SEUIL_AVERTISSEMENT_JOUEURS} joueurs, la rotation peut laisser des partenariats ou des adversaires répétés.`,
      );
    }
    return avertissements.length > 0 ? { ok: true, avertissement: avertissements.join(" ") } : { ok: true };
  },

  /** Statique : toutes les manches d'un coup, avec leurs binômes éphémères. */
  genererTours(etat: EtatTournoi): Tour[] {
    const ids = etat.participants.map((p) => p.id);
    const nbTours = etat.config.nbTours ?? nbToursParDefaut(ids.length);
    const rotation = genererRotation(ids, nbTours, etat.terrains, etat.graine);
    const terrains = [...etat.terrains].sort((a, b) => a.ordre - b.ordre);
    const plan = etat.planification;

    return rotation.tours.map((t) => {
      const matchs: MatchPrevu[] = t.manches.map((m, i) => {
        const base = `t${t.numero}-m${i + 1}`;
        const a: EquipeEphemere = { id: `eph-${base}-a`, joueurIds: m.paireA, tourOrigine: t.numero };
        const b: EquipeEphemere = { id: `eph-${base}-b`, joueurIds: m.paireB, tourOrigine: t.numero };
        const terrain = terrains[m.terrainIndex];
        const prevu: MatchPrevu = {
          id: `manche-${base}`,
          phase: "manche",
          groupeId: null,
          tour: t.numero,
          teamAId: a.id,
          teamBId: b.id,
          terrainId: terrain?.id,
          equipesEphemeres: [a, b],
        };
        if (plan && terrain) {
          const debut = new Date(plan.heureDebut).getTime() + (t.numero - 1) * (plan.dureeJeuMin + plan.rotationMin) * 60_000;
          prevu.placement = {
            terrainId: terrain.id,
            debut: new Date(debut).toISOString(),
            fin: new Date(debut + plan.dureeJeuMin * 60_000).toISOString(),
          };
        }
        return prevu;
      });
      return { numero: t.numero, matchs, exempts: t.exempts.map((participantId) => ({ groupeId: null, participantId })) };
    });
  },

  /** Statique : tout est généré par genererTours, il n'y a jamais de tour à ajouter après coup. */
  tourSuivant(): Tour | null {
    return null;
  },

  classement(etat: EtatTournoi): LigneClassement[] {
    const manches = manchesDeLEtat(etat);
    const lignes = classerJoueurs(
      etat.participants.map((p) => p.id),
      manches,
      toursExistants(etat.matchs),
      etat.config.criteresJoueurs ?? CRITERES_JOUEURS_PAR_DEFAUT,
      etat.config.modeClassement ?? "total",
    );
    return lignes.map((l) => ({
      rang: l.rang,
      participantId: l.joueurId,
      groupeId: null,
      joues: l.mancheJouees,
      victoires: l.victoires,
      defaites: manches.filter((m) => {
        const camp = m.campA.includes(l.joueurId) ? "a" : m.campB.includes(l.joueurId) ? "b" : null;
        return camp !== null && m.vainqueur !== null && m.vainqueur !== camp;
      }).length,
      pointsMarques: l.pointsMarques,
      pointsEncaisses: l.pointsEncaisses,
      difference: l.difference,
      toursExempt: l.toursExempt,
      pointsParManche: l.pointsParManche,
    }));
  },

  /** Terminé quand toutes les manches existantes sont validées et que les tours prévus ont tous eu lieu. */
  estTermine(etat: EtatTournoi): boolean {
    const manches = etat.matchs.filter((m) => m.phase === "manche");
    if (manches.length === 0) return false;
    if (!manches.every((m) => m.termine)) return false;
    return toursExistants(etat.matchs).length >= (etat.config.nbTours ?? toursExistants(etat.matchs).length);
  },
};

export { mancheParTour };
