"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { getParticipantConnecte } from "@/lib/participant/session";
import { chargerStatutInscription } from "./inscriptionStatus";
import { revalidatePath } from "next/cache";
import { z } from "zod";

type ActionResult = { error: string } | { success: true };

async function verifierTournoiOuvert(
  service: ReturnType<typeof createServiceClient>,
  tournamentId: string,
): Promise<string | null> {
  const { data: tournoi } = await service
    .from("tournaments")
    .select("statut")
    .eq("id", tournamentId)
    .maybeSingle();

  if (!tournoi || tournoi.statut !== "publie") {
    return "Les inscriptions ne sont plus ouvertes pour ce tournoi.";
  }
  return null;
}

const soloSchema = z.object({
  tournamentId: z.string().uuid(),
  slug: z.string().min(1),
});

export async function sInscrireSolo(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = soloSchema.safeParse({
    tournamentId: formData.get("tournamentId"),
    slug: formData.get("slug"),
  });
  if (!parsed.success) return { error: "Tournoi invalide." };

  const participant = await getParticipantConnecte();
  if (!participant) return { error: "Connecte-toi d'abord pour t'inscrire." };

  const service = createServiceClient();

  const erreurOuverture = await verifierTournoiOuvert(service, parsed.data.tournamentId);
  if (erreurOuverture) return { error: erreurOuverture };

  const statutActuel = await chargerStatutInscription(
    service,
    parsed.data.tournamentId,
    participant.playerId,
  );
  if (statutActuel.inscrit) return { error: "Tu es déjà inscrit(e) à ce tournoi." };

  const { error } = await service.from("registrations").insert({
    tournament_id: parsed.data.tournamentId,
    type: "solo",
    player_id: participant.playerId,
    statut: "en_attente",
  });
  if (error) return { error: "Impossible de t'inscrire." };

  revalidatePath(`/t/${parsed.data.slug}`);
  return { success: true };
}

const paireSchema = z.object({
  tournamentId: z.string().uuid(),
  slug: z.string().min(1),
  nomPartenaire: z.string().trim().min(1, "Le nom du/de la partenaire est requis."),
  prenomPartenaire: z.string().trim().min(1, "Le prénom du/de la partenaire est requis."),
});

export async function sInscrireEnPaire(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = paireSchema.safeParse({
    tournamentId: formData.get("tournamentId"),
    slug: formData.get("slug"),
    nomPartenaire: formData.get("nomPartenaire"),
    prenomPartenaire: formData.get("prenomPartenaire"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const participant = await getParticipantConnecte();
  if (!participant) return { error: "Connecte-toi d'abord pour t'inscrire." };

  const service = createServiceClient();

  const erreurOuverture = await verifierTournoiOuvert(service, parsed.data.tournamentId);
  if (erreurOuverture) return { error: erreurOuverture };

  const statutActuel = await chargerStatutInscription(
    service,
    parsed.data.tournamentId,
    participant.playerId,
  );
  if (statutActuel.inscrit) return { error: "Tu es déjà inscrit(e) à ce tournoi." };

  const { data: partenaire, error: partenaireError } = await service
    .from("players")
    .insert({ nom: parsed.data.nomPartenaire, prenom: parsed.data.prenomPartenaire })
    .select("id")
    .single();
  if (partenaireError || !partenaire) return { error: "Impossible d'enregistrer le/la partenaire." };

  const { data: team, error: teamError } = await service
    .from("teams")
    .insert({
      tournament_id: parsed.data.tournamentId,
      nom_affiche: `${participant.prenom} ${participant.nom} / ${parsed.data.prenomPartenaire} ${parsed.data.nomPartenaire}`,
      origine: "paire",
      statut: "en_attente",
    })
    .select("id")
    .single();
  if (teamError || !team) return { error: "Impossible de créer l'équipe." };

  const { error: tpError } = await service.from("team_players").insert([
    { team_id: team.id, player_id: participant.playerId },
    { team_id: team.id, player_id: partenaire.id },
  ]);
  if (tpError) return { error: "Impossible d'associer les joueurs à l'équipe." };

  const { error: regError } = await service.from("registrations").insert({
    tournament_id: parsed.data.tournamentId,
    type: "paire",
    team_id: team.id,
    statut: "en_attente",
  });
  if (regError) return { error: "Impossible d'enregistrer l'inscription." };

  revalidatePath(`/t/${parsed.data.slug}`);
  return { success: true };
}
