import type { createServiceClient } from "@/lib/supabase/service";
import { calculerPlaces, type Places } from "./places";

type Service = ReturnType<typeof createServiceClient>;

/**
 * Nombre de joueurs qui occupent une place : membres des équipes du
 * tournoi (validées ou en attente) + solos en attente de validation ou
 * validés mais sans équipe. Un solo déjà placé en équipe n'est compté
 * qu'une fois (via l'équipe). service_role requis : ces tables ne sont pas lisibles
 * publiquement.
 */
export async function chargerPlaces(service: Service, tournamentId: string): Promise<Places> {
  const [{ data: tournoi }, { data: membres }, { data: solos }] = await Promise.all([
    service.from("tournaments").select("max_participants").eq("id", tournamentId).maybeSingle(),
    service
      .from("team_players")
      .select("player_id, teams!inner(tournament_id)")
      .eq("teams.tournament_id", tournamentId),
    service
      .from("registrations")
      .select("player_id")
      .eq("tournament_id", tournamentId)
      .eq("type", "solo")
      .in("statut", ["en_attente", "valide"]),
  ]);

  const joueurs = new Set<string>();
  for (const m of membres ?? []) joueurs.add(m.player_id);
  for (const s of solos ?? []) if (s.player_id) joueurs.add(s.player_id);

  return calculerPlaces(tournoi?.max_participants ?? null, joueurs.size);
}
