// Persistance des tours d'un format à partenaires tournants (Americano) : chaque
// manche crée deux équipes éphémères (teams.ephemere = true, tour_origine) et un
// match ordinaire (phase « manche »). La saisie de score, l'audit et le temps réel
// existants s'y appliquent sans modification : ils ne voient qu'un match entre
// deux équipes.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Tour } from "@/lib/engine/formats";

type Client = SupabaseClient<Database>;

export interface MancheCreee {
  matchId: string;
  teamAId: string;
  teamBId: string;
}

function nomBinome(ids: [string, string], nomJoueur: Map<string, string>): string {
  return ids.map((id) => nomJoueur.get(id) ?? "?").join(" / ");
}

/**
 * Crée en base les équipes éphémères et les matchs d'un tour. `nomJoueur` donne le
 * nom affiché de chaque joueur. Idempotence : l'appelant ne régénère pas un tour déjà
 * créé (voir supprimerTourManches pour repartir de zéro).
 */
export async function creerTourManches(
  supabase: Client,
  tournamentId: string,
  tour: Tour,
  nomJoueur: Map<string, string>,
): Promise<{ manches: MancheCreee[] } | { error: string }> {
  const manches: MancheCreee[] = [];

  for (const m of tour.matchs) {
    if (!m.equipesEphemeres) return { error: "Manche sans équipes éphémères." };

    const idsEquipes: string[] = [];
    for (const eq of m.equipesEphemeres) {
      const { data: equipe, error } = await supabase
        .from("teams")
        .insert({
          tournament_id: tournamentId,
          nom_affiche: nomBinome(eq.joueurIds, nomJoueur),
          origine: "aleatoire",
          ephemere: true,
          tour_origine: eq.tourOrigine,
        })
        .select("id")
        .single();
      if (error || !equipe) return { error: "Impossible de créer une équipe éphémère." };

      const { error: errJoueurs } = await supabase
        .from("team_players")
        .insert(eq.joueurIds.map((playerId) => ({ team_id: equipe.id, player_id: playerId })));
      if (errJoueurs) return { error: "Impossible de composer une équipe éphémère." };
      idsEquipes.push(equipe.id);
    }

    const { data: match, error: errMatch } = await supabase
      .from("matches")
      .insert({
        tournament_id: tournamentId,
        phase: "manche",
        round: tour.numero,
        team_a_id: idsEquipes[0],
        team_b_id: idsEquipes[1],
        court_id: m.placement?.terrainId ?? m.terrainId ?? null,
        scheduled_at: m.placement?.debut ? new Date(m.placement.debut).toISOString() : null,
        statut: "a_venir",
      })
      .select("id")
      .single();
    if (errMatch || !match) return { error: "Impossible de créer la manche." };

    manches.push({ matchId: match.id, teamAId: idsEquipes[0], teamBId: idsEquipes[1] });
  }

  return { manches };
}

/** Supprime les manches d'un tour (matchs puis équipes éphémères de ce tour). */
export async function supprimerTourManches(supabase: Client, tournamentId: string, numeroTour: number) {
  await supabase
    .from("matches")
    .delete()
    .eq("tournament_id", tournamentId)
    .eq("phase", "manche")
    .eq("round", numeroTour);
  await supabase
    .from("teams")
    .delete()
    .eq("tournament_id", tournamentId)
    .eq("ephemere", true)
    .eq("tour_origine", numeroTour);
}
