import type { createServiceClient } from "@/lib/supabase/service";

export type StatutInscriptionParticipant =
  | { inscrit: false }
  | { inscrit: true; libelle: string; enAttente: boolean };

/**
 * Un participant est considéré comme déjà inscrit à un tournoi soit via
 * une inscription solo (en attente d'appariement ou déjà validée), soit
 * via une équipe (paire) dont il fait partie.
 */
export async function chargerStatutInscription(
  service: ReturnType<typeof createServiceClient>,
  tournamentId: string,
  playerId: string,
  /** Format à partenaires tournants : un joueur inscrit n'attend aucun binôme. */
  parJoueur = false,
): Promise<StatutInscriptionParticipant> {
  const { data: soloReg } = await service
    .from("registrations")
    .select("statut")
    .eq("tournament_id", tournamentId)
    .eq("player_id", playerId)
    .maybeSingle();

  if (soloReg) {
    return {
      inscrit: true,
      libelle: parJoueur
        ? "Inscrit(e) — tu changeras de partenaire à chaque tour"
        : "Inscrit(e) en solo, en attente d'un binôme",
      // Dans un format à rotation, l'inscription solo est définitive : il n'y a pas de binôme à attendre.
      enAttente: parJoueur ? false : soloReg.statut === "en_attente",
    };
  }

  const { data: liens } = await service
    .from("team_players")
    .select("teams!inner(nom_affiche, statut, tournament_id)")
    .eq("player_id", playerId)
    .eq("teams.tournament_id", tournamentId)
    .eq("teams.ephemere", false);

  const equipe = liens?.[0]?.teams;
  if (equipe) {
    return {
      inscrit: true,
      libelle: `Inscrit(e) : ${equipe.nom_affiche}`,
      enAttente: equipe.statut === "en_attente",
    };
  }

  return { inscrit: false };
}
