// Persistance des tours d'un format à partenaires tournants (Americano) : chaque
// manche crée deux équipes éphémères (teams.ephemere = true, tour_origine) et un
// match ordinaire (phase « manche »). La saisie de score, l'audit et le temps réel
// existants s'y appliquent sans modification : ils ne voient qu'un match entre
// deux équipes.

import { randomUUID } from "crypto";
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
 * Crée en base les équipes éphémères et les matchs des tours donnés, en trois requêtes en
 * lot (équipes, joueurs des équipes, matchs) : un Americano de 16 joueurs sur 7 tours, c'est
 * 56 équipes et 28 matchs. `nomJoueur` donne le nom affiché de chaque joueur. L'appelant ne
 * régénère pas des tours déjà créés (voir supprimerTourManches pour repartir de zéro).
 */
export async function creerManches(
  supabase: Client,
  tournamentId: string,
  tours: Tour[],
  nomJoueur: Map<string, string>,
): Promise<{ manches: MancheCreee[] } | { error: string }> {
  const equipes: Database["public"]["Tables"]["teams"]["Insert"][] = [];
  const membres: Database["public"]["Tables"]["team_players"]["Insert"][] = [];
  const matchs: (Database["public"]["Tables"]["matches"]["Insert"] & { id: string })[] = [];
  const manches: MancheCreee[] = [];

  for (const tour of tours) {
    for (const m of tour.matchs) {
      if (!m.equipesEphemeres) return { error: "Manche sans équipes éphémères." };

      const ids = m.equipesEphemeres.map(() => randomUUID());
      m.equipesEphemeres.forEach((eq, i) => {
        equipes.push({
          id: ids[i],
          tournament_id: tournamentId,
          nom_affiche: nomBinome(eq.joueurIds, nomJoueur),
          origine: "aleatoire",
          ephemere: true,
          tour_origine: eq.tourOrigine,
        });
        for (const playerId of eq.joueurIds) membres.push({ team_id: ids[i], player_id: playerId });
      });

      const matchId = randomUUID();
      matchs.push({
        id: matchId,
        tournament_id: tournamentId,
        phase: "manche",
        round: tour.numero,
        team_a_id: ids[0],
        team_b_id: ids[1],
        court_id: m.placement?.terrainId ?? m.terrainId ?? null,
        scheduled_at: m.placement?.debut ? new Date(m.placement.debut).toISOString() : null,
        statut: "a_venir",
      });
      manches.push({ matchId, teamAId: ids[0], teamBId: ids[1] });
    }
  }

  if (equipes.length === 0) return { manches };

  const { error: errEquipes } = await supabase.from("teams").insert(equipes);
  if (errEquipes) return { error: "Impossible de créer les équipes éphémères." };
  const { error: errMembres } = await supabase.from("team_players").insert(membres);
  if (errMembres) return { error: "Impossible de composer les équipes éphémères." };
  const { error: errMatchs } = await supabase.from("matches").insert(matchs);
  if (errMatchs) return { error: "Impossible de créer les manches." };

  return { manches };
}

/** Un seul tour (compatibilité : formats dynamiques qui ne génèrent que le tour suivant). */
export function creerTourManches(supabase: Client, tournamentId: string, tour: Tour, nomJoueur: Map<string, string>) {
  return creerManches(supabase, tournamentId, [tour], nomJoueur);
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

/** Supprime toutes les manches du tournoi (matchs puis équipes éphémères). */
export async function supprimerToutesLesManches(supabase: Client, tournamentId: string) {
  await supabase.from("matches").delete().eq("tournament_id", tournamentId).eq("phase", "manche");
  await supabase.from("teams").delete().eq("tournament_id", tournamentId).eq("ephemere", true);
}
