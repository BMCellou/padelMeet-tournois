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
): Promise<StatutInscriptionParticipant> {
  // L'équipe prime : un joueur seul placé en équipe par le club y est inscrit,
  // même si son inscription solo existe toujours.
  const { data: liens } = await service
    .from("team_players")
    .select("teams!inner(nom_affiche, statut, tournament_id)")
    .eq("player_id", playerId)
    .eq("teams.tournament_id", tournamentId);

  const equipe = liens?.[0]?.teams;
  if (equipe) {
    return {
      inscrit: true,
      libelle: `Inscrit(e) : ${equipe.nom_affiche}`,
      enAttente: equipe.statut === "en_attente",
    };
  }

  const { data: soloReg } = await service
    .from("registrations")
    .select("statut")
    .eq("tournament_id", tournamentId)
    .eq("player_id", playerId)
    .maybeSingle();

  if (soloReg) {
    const enAttente = soloReg.statut === "en_attente";
    return {
      inscrit: true,
      libelle: enAttente
        ? "Inscrit(e) en solo, en attente d'un binôme"
        : "Inscription validée, en attente d'un binôme",
      enAttente,
    };
  }

  return { inscrit: false };
}
