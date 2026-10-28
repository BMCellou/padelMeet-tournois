"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/service";
import { getParticipantConnecte } from "@/lib/participant/session";
import { heureLocaleVersISO } from "@/lib/temps";
import { verdictAnnulation } from "@/lib/inscriptions/annulation";
import { chargerPlaces } from "@/lib/inscriptions/occupation";
import { messageAnnulationOrganisateur, messageAnnulationPartenaire } from "@/lib/inscriptions/messages";
import { notifierAdmins, notifierParticipant } from "@/lib/inscriptions/notifier";
import type { Json } from "@/lib/supabase/database.types";

type ActionResult = { error: string } | { success: true };

const schema = z.object({ tournamentId: z.string().uuid() });

/**
 * Le participant connecté annule SA propre inscription (solo, ou paire : l'équipe entière, donc
 * son/sa partenaire aussi, qui est prévu(e) par e-mail), jusqu'à 48 h avant le début du tournoi.
 * Refusé si le tirage est fait : une équipe déjà placée en poule ne peut plus disparaître sans
 * casser le calendrier, l'organisateur doit s'en charger.
 */
export async function annulerMonInscription(tournamentId: string, slug: string): Promise<ActionResult> {
  if (!schema.safeParse({ tournamentId }).success) return { error: "Tournoi invalide." };

  const participant = await getParticipantConnecte();
  if (!participant) return { error: "Connecte-toi d'abord." };

  const service = createServiceClient();
  const { data: tournoi } = await service
    .from("tournaments")
    .select("id, nom, date, heure_debut, statut, max_participants")
    .eq("id", tournamentId)
    .maybeSingle();
  if (!tournoi) return { error: "Tournoi introuvable." };

  const debut = heureLocaleVersISO(tournoi.date, tournoi.heure_debut.slice(0, 5));
  const verdict = verdictAnnulation(tournoi.statut, debut, new Date());
  if (!verdict.possible) return { error: verdict.message };

  const nomComplet = `${participant.prenom} ${participant.nom}`;
  const infos = {
    nom: tournoi.nom,
    dateLisible: new Date(tournoi.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
  };
  const lienAdmin = process.env.NEXT_PUBLIC_SITE_URL ? `${process.env.NEXT_PUBLIC_SITE_URL}/admin/tournois/${tournamentId}/inscriptions` : null;

  // 1. Équipe du tournoi ? Un joueur seul placé en équipe par le club s'annule comme une paire,
  // même si son inscription solo existe toujours.
  const { data: lien } = await service
    .from("team_players")
    .select("team_id, teams!inner(id, tournament_id, ephemere)")
    .eq("player_id", participant.playerId)
    .eq("teams.tournament_id", tournamentId)
    .eq("teams.ephemere", false)
    .maybeSingle();

  // 2. Inscription solo (sans équipe) ?
  const { data: solo } = await service
    .from("registrations")
    .select("id")
    .eq("tournament_id", tournamentId)
    .eq("player_id", participant.playerId)
    .eq("type", "solo")
    .maybeSingle();

  let partenaire: { nom: string; email: string | null } | null = null;

  if (lien) {
    const { count: enPoule } = await service
      .from("group_teams")
      .select("team_id", { count: "exact", head: true })
      .eq("team_id", lien.team_id);
    if ((enPoule ?? 0) > 0) {
      return { error: "Le tirage au sort est déjà fait : contacte l'organisateur pour annuler ta participation." };
    }

    const { data: coequipiers } = await service
      .from("team_players")
      .select("players(nom, prenom, email)")
      .eq("team_id", lien.team_id)
      .neq("player_id", participant.playerId);
    const autre = coequipiers?.[0]?.players;
    if (autre) partenaire = { nom: `${autre.prenom} ${autre.nom}`, email: autre.email };

    // La suppression de l'équipe cascade sur team_players et registrations de paire ; les fiches
    // joueurs restent. L'inscription solo éventuelle n'est pas rattachée à l'équipe : on la retire.
    await service.from("teams").delete().eq("id", lien.team_id);
    if (solo) await service.from("registrations").delete().eq("id", solo.id);
  } else if (solo) {
    await service.from("registrations").delete().eq("id", solo.id);
  } else {
    return { error: "Tu n'es pas inscrit(e) à ce tournoi." };
  }

  await service.from("audit_log").insert({
    tournament_id: tournamentId,
    acteur: `${nomComplet} (participant)`,
    action: "annulation_inscription",
    payload: { playerId: participant.playerId, type: lien ? "paire" : "solo", partenaire: partenaire?.nom ?? null } as unknown as Json,
  });

  after(async () => {
    const places = await chargerPlaces(service, tournamentId);
    await notifierAdmins(
      service,
      messageAnnulationOrganisateur(
        infos,
        nomComplet,
        partenaire?.nom ?? null,
        { occupees: places.occupees, max: tournoi.max_participants },
        lienAdmin,
      ),
    );
    if (partenaire) await notifierParticipant(partenaire.email, messageAnnulationPartenaire(infos, nomComplet));
  });

  revalidatePath(`/t/${slug}`);
  revalidatePath("/compte/historique");
  revalidatePath(`/admin/tournois/${tournamentId}/inscriptions`);
  return { success: true };
}
