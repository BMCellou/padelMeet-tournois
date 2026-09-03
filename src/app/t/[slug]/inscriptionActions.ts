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
  // Obligatoire : laisser ce champ optionnel revient à offrir une porte
  // de sortie à quiconque hésite, et donc à recréer des doublons — l'un
  // des principaux problèmes que ce champ est censé éviter. Ça ne veut
  // pas dire que le compte doit déjà exister (voir trouverPartenaireExistant) :
  // juste que l'e-mail doit être fourni pour tenter le rapprochement.
  emailPartenaire: z.string().trim().toLowerCase().email("L'e-mail du/de la partenaire est requis."),
});

/**
 * Cherche une fiche joueur existante pour le/la partenaire (compte déjà
 * créé), sans jamais se fier au seul e-mail : il doit correspondre au
 * nom ET au prénom saisis, sinon un e-mail tapé par erreur pourrait
 * rattacher le compte d'une tierce personne à l'insu de tous. Si rien ne
 * correspond, on ne crée rien ici : l'appelant retombe sur une fiche
 * simple (comme aujourd'hui).
 */
async function trouverPartenaireExistant(
  service: ReturnType<typeof createServiceClient>,
  email: string,
  nom: string,
  prenom: string,
): Promise<{ id: string; nom: string; prenom: string } | null> {
  const { data } = await service
    .from("players")
    .select("id, nom, prenom")
    .eq("email", email)
    .not("user_id", "is", null)
    .ilike("nom", nom)
    .ilike("prenom", prenom)
    .maybeSingle();

  return data;
}

export async function sInscrireEnPaire(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = paireSchema.safeParse({
    tournamentId: formData.get("tournamentId"),
    slug: formData.get("slug"),
    nomPartenaire: formData.get("nomPartenaire"),
    prenomPartenaire: formData.get("prenomPartenaire"),
    emailPartenaire: formData.get("emailPartenaire"),
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

  let partenaireId: string;
  let nomAffichePartenaire = `${parsed.data.prenomPartenaire} ${parsed.data.nomPartenaire}`;

  const partenaireExistant = await trouverPartenaireExistant(
    service,
    parsed.data.emailPartenaire,
    parsed.data.nomPartenaire,
    parsed.data.prenomPartenaire,
  );

  if (partenaireExistant) {
    if (partenaireExistant.id === participant.playerId) {
      return { error: "Tu ne peux pas être ta/ton propre partenaire." };
    }
    const statutPartenaire = await chargerStatutInscription(
      service,
      parsed.data.tournamentId,
      partenaireExistant.id,
    );
    if (statutPartenaire.inscrit) {
      return { error: "Ton/ta partenaire est déjà inscrit(e) à ce tournoi." };
    }
    partenaireId = partenaireExistant.id;
    // Reprend la casse réelle de son profil (la recherche est
    // insensible à la casse) pour un affichage cohérent avec son compte.
    nomAffichePartenaire = `${partenaireExistant.prenom} ${partenaireExistant.nom}`;
  } else {
    const { data: partenaire, error: partenaireError } = await service
      .from("players")
      .insert({
        nom: parsed.data.nomPartenaire,
        prenom: parsed.data.prenomPartenaire,
        email: parsed.data.emailPartenaire,
      })
      .select("id")
      .single();
    if (partenaireError || !partenaire) return { error: "Impossible d'enregistrer le/la partenaire." };
    partenaireId = partenaire.id;
  }

  const { data: team, error: teamError } = await service
    .from("teams")
    .insert({
      tournament_id: parsed.data.tournamentId,
      nom_affiche: `${participant.prenom} ${participant.nom} / ${nomAffichePartenaire}`,
      origine: "paire",
      statut: "en_attente",
    })
    .select("id")
    .single();
  if (teamError || !team) return { error: "Impossible de créer l'équipe." };

  const { error: tpError } = await service.from("team_players").insert([
    { team_id: team.id, player_id: participant.playerId },
    { team_id: team.id, player_id: partenaireId },
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
