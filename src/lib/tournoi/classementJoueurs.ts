// Classement individuel d'un format à manches (Americano) : calcul pur à partir des manches
// validées, puis persistance dans `standings_joueurs`. La page publique lit cette table en
// une requête, sans recalcul : on la met à jour à chaque validation, correction, forfait
// ou réinitialisation d'une manche.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { ConfigAnimation } from "@/lib/engine/formats";
import { CRITERES_JOUEURS_PAR_DEFAUT, classerJoueurs, type MancheJouee } from "@/lib/engine/formats/americano";

type Client = SupabaseClient<Database>;

export interface MancheBrute {
  id: string;
  tour: number;
  statut: string;
  winnerId: string | null;
  teamAId: string | null;
  teamBId: string | null;
  /** Une manche = un seul « set » dont les jeux sont les points. */
  pointsA: number;
  pointsB: number;
}

export interface DonneesClassementJoueurs {
  joueurs: { id: string; nomAffiche: string }[];
  manches: MancheBrute[];
  /** Équipe éphémère → ses deux joueurs. */
  equipes: Map<string, [string, string]>;
  config: ConfigAnimation;
}

export interface LigneStandingJoueur {
  playerId: string;
  nomAffiche: string;
  manchesJouees: number;
  victoires: number;
  pointsMarques: number;
  pointsEncaisses: number;
  difference: number;
  toursExempt: number;
  pointsParManche: number;
  rang: number;
}

const arrondi2 = (v: number) => Math.round(v * 100) / 100;

function estTerminee(statut: string): boolean {
  return statut === "valide" || statut === "forfait";
}

export function calculerStandingsJoueurs(d: DonneesClassementJoueurs): LigneStandingJoueur[] {
  const jouees: MancheJouee[] = [];
  for (const m of d.manches) {
    if (!estTerminee(m.statut) || !m.teamAId || !m.teamBId) continue;
    const a = d.equipes.get(m.teamAId);
    const b = d.equipes.get(m.teamBId);
    if (!a || !b) continue;
    jouees.push({
      tour: m.tour,
      campA: a,
      campB: b,
      pointsA: m.statut === "forfait" ? 0 : m.pointsA,
      pointsB: m.statut === "forfait" ? 0 : m.pointsB,
      vainqueur: m.winnerId === m.teamAId ? "a" : m.winnerId === m.teamBId ? "b" : null,
    });
  }

  // Un tour compte pour les exemptions une fois TOUTES ses manches terminées : sinon un joueur
  // dont la manche est encore en cours serait compté exempté.
  const parTour = new Map<number, boolean>();
  for (const m of d.manches) parTour.set(m.tour, (parTour.get(m.tour) ?? true) && estTerminee(m.statut));
  const toursTermines = [...parTour.entries()].filter(([, fini]) => fini).map(([tour]) => tour);

  const lignes = classerJoueurs(
    d.joueurs.map((j) => j.id),
    jouees,
    toursTermines,
    d.config.criteresJoueurs ?? CRITERES_JOUEURS_PAR_DEFAUT,
    d.config.modeClassement ?? "total",
  );
  const noms = new Map(d.joueurs.map((j) => [j.id, j.nomAffiche]));
  return lignes.map((l) => ({
    playerId: l.joueurId,
    nomAffiche: noms.get(l.joueurId) ?? "?",
    manchesJouees: l.mancheJouees,
    victoires: l.victoires,
    pointsMarques: l.pointsMarques,
    pointsEncaisses: l.pointsEncaisses,
    difference: l.difference,
    toursExempt: l.toursExempt,
    pointsParManche: arrondi2(l.pointsParManche),
    rang: l.rang,
  }));
}

/** Lit l'état du tournoi, recalcule le classement individuel et l'écrit dans standings_joueurs. */
export async function recalculerClassementJoueurs(supabase: Client, tournamentId: string): Promise<void> {
  const [{ data: tournoi }, { data: matchs }, { data: equipes }, { data: solos }] = await Promise.all([
    supabase.from("tournaments").select("config_animation").eq("id", tournamentId).single(),
    supabase
      .from("matches")
      .select("id, round, statut, winner_id, team_a_id, team_b_id, match_sets(numero, jeux_a, jeux_b)")
      .eq("tournament_id", tournamentId)
      .eq("phase", "manche"),
    supabase
      .from("teams")
      .select("id, team_players(player_id)")
      .eq("tournament_id", tournamentId)
      .eq("ephemere", true),
    supabase
      .from("registrations")
      .select("player_id")
      .eq("tournament_id", tournamentId)
      .eq("type", "solo")
      .neq("statut", "annule"),
  ]);

  const equipesParId = new Map<string, [string, string]>();
  const idsJoueurs = new Set<string>();
  for (const e of equipes ?? []) {
    const ids = e.team_players.map((tp) => tp.player_id);
    if (ids.length === 2) equipesParId.set(e.id, [ids[0], ids[1]]);
    for (const id of ids) idsJoueurs.add(id);
  }
  for (const s of solos ?? []) if (s.player_id) idsJoueurs.add(s.player_id);

  const { data: joueursBruts } = idsJoueurs.size
    ? await supabase.from("players").select("id, nom, prenom").in("id", [...idsJoueurs])
    : { data: [] };

  const lignes = calculerStandingsJoueurs({
    joueurs: (joueursBruts ?? []).map((p) => ({ id: p.id, nomAffiche: `${p.prenom} ${p.nom}` })),
    manches: (matchs ?? []).map((m) => {
      const manche = [...m.match_sets].sort((a, b) => a.numero - b.numero)[0];
      return {
        id: m.id,
        tour: m.round,
        statut: m.statut,
        winnerId: m.winner_id,
        teamAId: m.team_a_id,
        teamBId: m.team_b_id,
        pointsA: manche?.jeux_a ?? 0,
        pointsB: manche?.jeux_b ?? 0,
      };
    }),
    equipes: equipesParId,
    config: (tournoi?.config_animation ?? {}) as ConfigAnimation,
  });

  if (lignes.length > 0) {
    await supabase.from("standings_joueurs").upsert(
      lignes.map((l) => ({
        tournament_id: tournamentId,
        player_id: l.playerId,
        nom_affiche: l.nomAffiche,
        manches_jouees: l.manchesJouees,
        victoires: l.victoires,
        points_marques: l.pointsMarques,
        points_encaisses: l.pointsEncaisses,
        difference: l.difference,
        tours_exempt: l.toursExempt,
        points_par_manche: l.pointsParManche,
        rang: l.rang,
      })),
      { onConflict: "tournament_id,player_id" },
    );
  }

  // Un joueur retiré du tournoi ne doit plus figurer au classement.
  const presents = lignes.map((l) => l.playerId);
  const suppression = supabase.from("standings_joueurs").delete().eq("tournament_id", tournamentId);
  await (presents.length > 0 ? suppression.not("player_id", "in", `(${presents.join(",")})`) : suppression);
}
