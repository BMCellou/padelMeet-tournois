// Second tour par niveaux (formats « poules de niveau », avec ou sans phase finale) : génération automatique dès que le
// premier tour est terminé, régénération tant qu'aucun match de niveau n'a été joué, et
// classement final. Un niveau est un groupe (`groups.niveau` renseigné) : ses matchs, son
// classement et ses écrans sont ceux d'une poule. Les décisions (composition, tours, placement)
// viennent du format (`format.tourSuivant`, `format.niveaux`) ; ce fichier ne fait que lire et écrire.

import type { createClient } from "@/lib/supabase/server";
import type { CritereDepartage } from "@/lib/engine/classement";
import { DEPARTAGE_PAR_DEFAUT } from "@/lib/engine/formatMatch";
import { matchCommence } from "@/lib/engine/formatPhases";
import type { EtatTournoi, FormatAnimation, GroupeEtat, MatchEtat } from "@/lib/engine/formats";
import type { Qualifie } from "@/lib/engine/tableau";
import { egalitesTranchees } from "@/lib/engine/niveaux";
import type { Json } from "@/lib/supabase/database.types";
import { heureLocaleVersISO } from "@/lib/temps";
import { versMatchTermine, recalculerClassementPoule } from "./classementPoule";
import { calculerClassementFinalTableau } from "./classementFinalAffichage";
import { chargerFormat } from "./formatAnimation";
import { appliquerFormatsParPhase } from "./formatParPhase";

/** Phases du tableau d'une variante avec phase finale (tableau, petite finale, match pour la 5e place). */
const PHASES_TABLEAU = ["tableau", "classement", "classement_5e"] as const;

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type ResultatNiveaux = { ok: true; genere: boolean } | { ok: false; error: string };

interface Contexte {
  format: FormatAnimation;
  etat: EtatTournoi;
  criteres: CritereDepartage[];
  /** Groupes de niveau déjà en base, avec leurs matchs. */
  niveaux: { id: string; niveau: number; matchs: { id: string; statut: string }[] }[];
}

/** Lit le tournoi tel que le voit le format : groupes (poules et niveaux), matchs de groupe, terrains, planification. */
async function chargerContexte(supabase: SupabaseServerClient, tournamentId: string): Promise<Contexte | null> {
  const format = await chargerFormat(supabase, tournamentId);
  if (!format.niveaux) return null;

  const [{ data: tournoi }, { data: groupes }, { data: matchs }, { data: liens }, { data: matchsTableau }] = await Promise.all([
    supabase
      .from("tournaments")
      .select("date, heure_debut, duree_match_min, pause_min, repos_min_min, tiebreak_rules, nb_qualifies")
      .eq("id", tournamentId)
      .single(),
    supabase
      .from("groups")
      .select("id, nom, niveau, ordre, group_teams(team_id, position_tirage)")
      .eq("tournament_id", tournamentId)
      .order("ordre"),
    supabase
      .from("matches")
      .select(
        "id, group_id, round, team_a_id, team_b_id, winner_id, statut, court_id, scheduled_at, duree_estimee, match_sets(jeux_a, jeux_b, tiebreak_a, tiebreak_b)",
      )
      .eq("tournament_id", tournamentId)
      .eq("phase", "poule"),
    supabase.from("tournament_courts").select("courts(id, ordre)").eq("tournament_id", tournamentId),
    supabase.from("matches").select("id, phase, round, statut").eq("tournament_id", tournamentId).in("phase", [...PHASES_TABLEAU]),
  ]);
  if (!tournoi || !groupes) return null;

  const criteres = (tournoi.tiebreak_rules as unknown as CritereDepartage[] | null) ?? DEPARTAGE_PAR_DEFAUT;
  const dureeJeuMin = tournoi.duree_match_min ?? 25;

  const groupesEtat: GroupeEtat[] = groupes.map((g) => ({
    id: g.id,
    nom: g.nom,
    niveau: g.niveau,
    participantIds: [...g.group_teams].sort((a, b) => (a.position_tirage ?? 0) - (b.position_tirage ?? 0)).map((gt) => gt.team_id),
  }));

  const matchsEtat: MatchEtat[] = (matchs ?? []).map((m) => {
    const termine = m.statut === "valide" || m.statut === "forfait";
    return {
      id: m.id,
      phase: "groupe",
      groupeId: m.group_id,
      tour: m.round,
      teamAId: m.team_a_id,
      teamBId: m.team_b_id,
      termine,
      vainqueurId: m.winner_id,
      resultat: termine && m.winner_id ? versMatchTermine(m) : undefined,
      placement:
        m.court_id && m.scheduled_at
          ? {
              terrainId: m.court_id,
              debut: m.scheduled_at,
              fin: new Date(new Date(m.scheduled_at).getTime() + (m.duree_estimee ?? dureeJeuMin) * 60_000).toISOString(),
            }
          : undefined,
    };
  });

  const terrains = (liens ?? []).flatMap((l) => (l.courts ? [{ id: l.courts.id, ordre: l.courts.ordre }] : []));

  const etat: EtatTournoi = {
    participants: [],
    terrains,
    config: { criteres, nbQualifies: tournoi.nb_qualifies ?? undefined },
    graine: 0,
    planification:
      terrains.length > 0
        ? {
            heureDebut: heureLocaleVersISO(tournoi.date, tournoi.heure_debut.slice(0, 5)),
            dureeJeuMin,
            rotationMin: tournoi.pause_min ?? 5,
            reposMinMin: tournoi.repos_min_min,
          }
        : undefined,
    groupes: groupesEtat,
    // Les matchs du tableau n'ont qu'un rôle ici : savoir qu'il existe déjà (le format ne génère alors rien).
    matchs: [
      ...matchsEtat,
      ...(matchsTableau ?? []).map((m): MatchEtat => ({
        id: m.id,
        phase: m.phase === "tableau" ? "finale" : m.phase === "classement_5e" ? "classement_5e" : "classement",
        groupeId: null,
        tour: m.round,
        teamAId: null,
        teamBId: null,
        termine: m.statut === "valide" || m.statut === "forfait",
        vainqueurId: null,
      })),
    ],
  };

  const niveaux = groupes
    .filter((g) => g.niveau !== null)
    .map((g) => ({
      id: g.id,
      niveau: g.niveau!,
      matchs: (matchs ?? []).filter((m) => m.group_id === g.id).map((m) => ({ id: m.id, statut: m.statut })),
    }));

  return { format, etat, criteres, niveaux };
}

async function acteur(supabase: SupabaseServerClient): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email ?? "admin";
}

/** Matchs du second tour : ceux des niveaux, et pour la variante avec phase finale ceux du tableau. */
async function matchsDuSecondTour(
  supabase: SupabaseServerClient,
  tournamentId: string,
): Promise<{ groupesNiveau: string[]; matchs: { id: string; statut: string }[] }> {
  const format = await chargerFormat(supabase, tournamentId);
  const { data: groupes } = await supabase.from("groups").select("id").eq("tournament_id", tournamentId).not("niveau", "is", null);
  const groupesNiveau = (groupes ?? []).map((g) => g.id);
  const matchs: { id: string; statut: string }[] = [];
  if (groupesNiveau.length > 0) {
    const { data } = await supabase.from("matches").select("id, statut").in("group_id", groupesNiveau);
    matchs.push(...(data ?? []));
  }
  if (format.phaseFinale) {
    const { data } = await supabase.from("matches").select("id, statut").eq("tournament_id", tournamentId).in("phase", [...PHASES_TABLEAU]);
    matchs.push(...(data ?? []));
  }
  return { groupesNiveau, matchs };
}

/** Le second tour existe-t-il, et un de ses matchs a-t-il commencé ? (Sert aux gardes des corrections.) */
export async function etatDuSecondTour(
  supabase: SupabaseServerClient,
  tournamentId: string,
): Promise<{ existe: boolean; commence: boolean }> {
  const { groupesNiveau, matchs } = await matchsDuSecondTour(supabase, tournamentId);
  if (groupesNiveau.length === 0 && matchs.length === 0) return { existe: false, commence: false };
  return { existe: true, commence: matchs.some((m) => matchCommence(m.statut)) };
}

/** Supprime le second tour (niveaux, et tableau de la variante avec phase finale). Refuse si un de ses matchs a commencé. */
export async function supprimerSecondTour(
  supabase: SupabaseServerClient,
  tournamentId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { groupesNiveau, matchs } = await matchsDuSecondTour(supabase, tournamentId);
  if (groupesNiveau.length === 0 && matchs.length === 0) return { ok: true };

  if (matchs.some((m) => matchCommence(m.statut))) {
    return { ok: false, error: "Des matchs du second tour ont déjà commencé : sa composition ne peut plus changer." };
  }
  // Les matchs ne suivent pas la suppression d'un groupe (set null) : on les retire d'abord.
  if (matchs.length > 0) await supabase.from("matches").delete().in("id", matchs.map((m) => m.id));
  if (groupesNiveau.length > 0) await supabase.from("groups").delete().in("id", groupesNiveau); // group_teams et standings suivent (cascade)
  return { ok: true };
}

/**
 * Génère le second tour si le premier est terminé et qu'il n'existe pas encore. Ne fait rien (et ne
 * signale rien) tant que les conditions ne sont pas réunies : appelée après chaque validation de poule,
 * elle ne doit jamais faire échouer la saisie d'un score.
 */
export async function tenterGenerationNiveaux(supabase: SupabaseServerClient, tournamentId: string): Promise<ResultatNiveaux> {
  const contexte = await chargerContexte(supabase, tournamentId);
  if (!contexte) return { ok: true, genere: false };
  const { format, etat } = contexte;

  const tour = format.tourSuivant(etat);
  if (!tour || !tour.groupes) return { ok: true, genere: false };

  // Égalités parfaites que l'ordre du classement a tranchées malgré tout : on les trace.
  const premierTour = new Set((etat.groupes ?? []).filter((g) => !g.niveau).map((g) => g.id));
  const egalites = egalitesTranchees(
    [...premierTour].map((groupId) => ({
      groupId,
      equipes: format
        .classement(etat)
        .filter((l) => l.groupeId === groupId)
        .map((l) => ({ teamId: l.participantId, rang: l.rang, joues: l.joues, v: l.victoires, d: l.defaites, setsG: 0, setsP: 0, jeuxG: 0, jeuxP: 0, ratioSets: 0, ratioJeux: 0 })),
    })),
  );

  const nbGroupes = etat.groupes?.length ?? 0;
  const idReel = new Map<string, string>();
  const echec = async (error: string): Promise<ResultatNiveaux> => {
    await supprimerSecondTour(supabase, tournamentId);
    return { ok: false, error };
  };

  for (const g of tour.groupes) {
    const { data: groupe, error } = await supabase
      .from("groups")
      .insert({ tournament_id: tournamentId, nom: g.nom, ordre: nbGroupes + (g.niveau ?? 0), niveau: g.niveau ?? null })
      .select("id")
      .single();
    if (error || !groupe) return echec("Impossible de créer les niveaux du second tour.");
    idReel.set(g.id, groupe.id);

    const { error: erreurEquipes } = await supabase
      .from("group_teams")
      .insert(g.participantIds.map((teamId, i) => ({ group_id: groupe.id, team_id: teamId, position_tirage: i + 1 })));
    if (erreurEquipes) return echec("Impossible d'affecter les équipes aux niveaux.");
  }

  // Les matchs de niveau : avec phase finale, ils sont placés avec le tableau (planifierTableauFinal) ;
  // sans, le format les a déjà placés à la suite du premier tour.
  const avecPhaseFinale = !!format.phaseFinale;
  const dureeJeuMin = etat.planification?.dureeJeuMin ?? null;
  const matchsNiveaux = tour.matchs.filter((m) => m.phase === "groupe");
  if (matchsNiveaux.length > 0) {
    const { error: erreurMatchs } = await supabase.from("matches").insert(
      matchsNiveaux.map((m) => ({
        tournament_id: tournamentId,
        phase: "poule" as const,
        group_id: idReel.get(m.groupeId!)!,
        round: m.tour,
        team_a_id: m.teamAId,
        team_b_id: m.teamBId,
        statut: "a_venir" as const,
        court_id: avecPhaseFinale ? null : (m.placement?.terrainId ?? null),
        scheduled_at: avecPhaseFinale ? null : (m.placement?.debut ?? null),
        duree_estimee: !avecPhaseFinale && m.placement ? dureeJeuMin : null,
      })),
    );
    if (erreurMatchs) return echec("Impossible de créer les matchs du second tour.");
  }

  if (avecPhaseFinale) {
    // Tableau des qualifiés : mêmes règles que le format « poules + tableau » (placement, petite finale, câblage).
    const groupeDe = (teamId: string) => (etat.groupes ?? []).find((g) => !g.niveau && g.participantIds.includes(teamId))!.id;
    const premierTourTableau = [
      ...new Set(
        tour.matchs
          .filter((m) => m.phase === "finale" && m.tour === 1)
          .flatMap((m) => [m.teamAId, m.teamBId])
          .filter((id): id is string => !!id),
      ),
    ];
    const qualifies: Qualifie[] = premierTourTableau.map((teamId) => ({ teamId, groupId: groupeDe(teamId) }));
    const { genererTableauAvecQualifies } = await import("./tableauFinal"); // import différé : tableauFinal importe ce fichier
    const tableau = await genererTableauAvecQualifies(supabase, tournamentId, qualifies, null, false);
    if ("error" in tableau) return echec(tableau.error);
  }

  await appliquerFormatsParPhase(supabase, tournamentId);
  for (const groupId of idReel.values()) {
    await recalculerClassementPoule(supabase, tournamentId, groupId, contexte.criteres);
  }

  await supabase.from("audit_log").insert({
    tournament_id: tournamentId,
    acteur: await acteur(supabase),
    action: "generation_niveaux",
    payload: {
      niveaux: tour.groupes.map((g) => ({ nom: g.nom, equipes: g.participantIds.length })),
      matchs: tour.matchs.length,
      phaseFinale: avecPhaseFinale,
      egalitesTranchees: egalites,
    } as unknown as Json,
  });

  return { ok: true, genere: true };
}

/** Refait le second tour à partir des classements actuels (après une correction du premier tour, avant tout match de niveau joué). */
export async function regenererNiveaux(supabase: SupabaseServerClient, tournamentId: string): Promise<ResultatNiveaux> {
  const suppression = await supprimerSecondTour(supabase, tournamentId);
  if (!suppression.ok) return { ok: false, error: suppression.error };
  return tenterGenerationNiveaux(supabase, tournamentId);
}

// ── Classement final ────────────────────────────────────────────────────

export interface LigneFinaleNiveaux {
  rang: number;
  equipeNom: string;
  /** Niveau de classement de l'équipe ; null pour une équipe du tableau (variante avec phase finale). */
  niveau: number | null;
}

/**
 * Classement de la 1re à la dernière place, ou null tant que le second tour n'existe pas ou n'est pas terminé.
 * Variante avec phase finale : le tableau (finale, petite finale…) occupe les premières places, les niveaux
 * les suivantes. Les équipes d'un niveau d'une seule équipe (qui ne joue pas) gardent leur place.
 */
export async function chargerClassementFinalNiveaux(
  supabase: SupabaseServerClient,
  tournamentId: string,
): Promise<LigneFinaleNiveaux[] | null> {
  const format = await chargerFormat(supabase, tournamentId);
  if (!format.niveaux) return null;

  const [{ data: groupes }, { data: standings }, { data: equipes }, { data: matchsTableau }] = await Promise.all([
    supabase.from("groups").select("id, niveau, group_teams(team_id)").eq("tournament_id", tournamentId),
    supabase
      .from("standings")
      .select("group_id, team_id, rang, joues, v, ratio_sets, ratio_jeux")
      .eq("tournament_id", tournamentId)
      .not("group_id", "is", null),
    supabase.from("teams").select("id, nom_affiche").eq("tournament_id", tournamentId),
    supabase
      .from("matches")
      .select("phase, round, team_a_id, team_b_id, winner_id, statut, next_match_id")
      .eq("tournament_id", tournamentId)
      .in("phase", ["tableau", "classement"]),
  ]);
  if (!groupes || !standings || !equipes) return null;

  const niveaux = groupes.filter((g) => g.niveau !== null);
  const nom = new Map(equipes.map((e) => [e.id, e.nom_affiche]));

  // Un classement « final » n'a de sens qu'une fois tous les matchs du second tour joués.
  if (niveaux.length > 0) {
    const { data: matchsNiveaux } = await supabase.from("matches").select("statut").in("group_id", niveaux.map((g) => g.id));
    if ((matchsNiveaux ?? []).some((m) => m.statut !== "valide" && m.statut !== "forfait")) return null;
  }

  // Variante avec phase finale : les qualifiés du tableau prennent les premières places.
  let lignesTableau: { rang: number; equipeNom: string }[] = [];
  const idsQualifies = new Set<string>();
  if (format.phaseFinale) {
    const bracket = (matchsTableau ?? []).filter((m) => m.phase === "tableau");
    if (bracket.length === 0) return null;
    for (const m of bracket) for (const id of [m.team_a_id, m.team_b_id]) if (id) idsQualifies.add(id);
    const lignes = calculerClassementFinalTableau(
      bracket,
      (matchsTableau ?? []).find((m) => m.phase === "classement") ?? null,
      null,
      [...idsQualifies],
      new Map(standings.map((s) => [s.team_id, s])),
      nom,
      format,
    );
    if (!lignes) return null;
    lignesTableau = lignes;
  } else if (niveaux.length === 0) {
    return null;
  }

  const classes = niveaux.map((g) => ({
    niveau: g.niveau!,
    equipes: standings
      .filter((s) => s.group_id === g.id)
      .map((s) => ({ teamId: s.team_id, rang: s.rang ?? 1 }))
      .sort((a, b) => a.rang - b.rang),
  }));

  // Équipes qui ne jouent pas au second tour (niveau d'une seule équipe) : rang de poule = niveau.
  const dansUnNiveau = new Set(niveaux.flatMap((g) => g.group_teams.map((gt) => gt.team_id)));
  const poules = groupes.filter((g) => g.niveau === null);
  const seules = new Map<number, { teamId: string; rang: number }[]>();
  for (const s of standings) {
    if (dansUnNiveau.has(s.team_id) || idsQualifies.has(s.team_id) || !poules.some((p) => p.id === s.group_id)) continue;
    const niveau = s.rang ?? 1;
    seules.set(niveau, [...(seules.get(niveau) ?? []), { teamId: s.team_id, rang: 1 }]);
  }
  for (const [niveau, eq] of seules) classes.push({ niveau, equipes: eq });

  return [
    ...lignesTableau.map((l) => ({ rang: l.rang, equipeNom: l.equipeNom, niveau: null })),
    ...format.niveaux
      .classementFinal(classes, lignesTableau.length)
      .map((l) => ({ rang: l.rang, equipeNom: nom.get(l.equipeId) ?? "?", niveau: l.niveau })),
  ];
}
