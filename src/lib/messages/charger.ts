import type { createClient } from "@/lib/supabase/server";
import { construireDestinataires, type Destinataire } from "./inscrits";

type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * Les joueurs inscrits au tournoi (équipes réelles et joueurs seuls), avec leur e-mail.
 * Les équipes éphémères d'un format à partenaires tournants ne sont pas des inscriptions.
 */
export async function chargerDestinatairesTournoi(supabase: Client, tournamentId: string): Promise<Destinataire[]> {
  const [{ data: equipes }, { data: solos }] = await Promise.all([
    supabase
      .from("teams")
      .select("statut, team_players(players(id, prenom, nom, email))")
      .eq("tournament_id", tournamentId)
      // `filter` : la colonne `ephemere` (lot 9) est absente des types générés de cette branche.
      .filter("ephemere", "eq", false),
    supabase
      .from("registrations")
      .select("statut, players(id, prenom, nom, email)")
      .eq("tournament_id", tournamentId)
      .eq("type", "solo"),
  ]);

  return construireDestinataires(
    (equipes ?? []).map((e) => ({
      statut: e.statut,
      joueurs: e.team_players.flatMap((tp) => (tp.players ? [tp.players] : [])),
    })),
    (solos ?? []).map((s) => ({ statut: s.statut, joueur: s.players })),
  );
}
