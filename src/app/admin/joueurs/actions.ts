"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { estAdmin } from "@/lib/staff/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";

type ActionResult = { error: string } | { success: true };

const PAGE_PATH = "/admin/joueurs";

const remplacerSchema = z.object({
  teamId: z.string().uuid(),
  ancienPlayerId: z.string().uuid(),
  nouveauPlayerId: z.string().uuid(),
});

/**
 * Remplace un joueur par un autre dans une équipe, depuis la vue globale
 * (tous tournois confondus). Même garde-fou que côté Inscriptions
 * (tournoi par tournoi) : le remplaçant ne doit pas déjà jouer dans une
 * autre équipe de CE tournoi.
 */
export async function remplacerJoueurDansEquipe(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await estAdmin())) return { error: "Non autorisé." };

  const parsed = remplacerSchema.safeParse({
    teamId: formData.get("teamId"),
    ancienPlayerId: formData.get("ancienPlayerId"),
    nouveauPlayerId: formData.get("nouveauPlayerId"),
  });

  if (!parsed.success) {
    return { error: "Requête invalide." };
  }
  if (parsed.data.ancienPlayerId === parsed.data.nouveauPlayerId) {
    return { error: "Choisis un joueur différent." };
  }

  const supabase = await createClient();

  const { data: team } = await supabase
    .from("teams")
    .select("tournament_id")
    .eq("id", parsed.data.teamId)
    .maybeSingle();

  if (!team) {
    return { error: "Équipe introuvable." };
  }

  const { data: dejaDansUneEquipe } = await supabase
    .from("team_players")
    .select("team_id, teams!inner(tournament_id)")
    .eq("player_id", parsed.data.nouveauPlayerId)
    .eq("teams.tournament_id", team.tournament_id)
    .maybeSingle();

  if (dejaDansUneEquipe) {
    return { error: "Ce joueur fait déjà partie d'une équipe de ce tournoi." };
  }

  const { error } = await supabase
    .from("team_players")
    .update({ player_id: parsed.data.nouveauPlayerId })
    .eq("team_id", parsed.data.teamId)
    .eq("player_id", parsed.data.ancienPlayerId);

  if (error) {
    return { error: "Impossible de remplacer ce joueur." };
  }

  revalidatePath(PAGE_PATH);
  revalidatePath(`/admin/tournois/${team.tournament_id}/inscriptions`);
  return { success: true };
}

export interface JoueurRecherche {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
}

/**
 * Recherche un·e remplaçant·e pour une équipe d'un tournoi précis :
 * exclut les joueurs déjà engagés dans ce même tournoi (équipe ou solo),
 * pour ne jamais proposer quelqu'un déjà inscrit ailleurs dans le même
 * tableau.
 */
export async function rechercherJoueursPourRemplacement(
  query: string,
  tournamentId: string,
): Promise<JoueurRecherche[]> {
  const q = query.trim().replace(/[,%]/g, "");
  if (q.length < 2) return [];

  const supabase = await createClient();

  const [{ data: matches }, { data: dejaEquipes }, { data: dejaSolo }] = await Promise.all([
    supabase
      .from("players")
      .select("id, nom, prenom, email")
      .or(`nom.ilike.%${q}%,prenom.ilike.%${q}%,email.ilike.%${q}%`)
      .order("nom")
      .limit(20),
    supabase
      .from("team_players")
      .select("player_id, teams!inner(tournament_id)")
      .eq("teams.tournament_id", tournamentId),
    supabase
      .from("registrations")
      .select("player_id")
      .eq("tournament_id", tournamentId)
      .eq("type", "solo")
      .not("player_id", "is", null),
  ]);

  const dejaInscritIds = new Set<string>([
    ...(dejaEquipes ?? []).map((r) => r.player_id),
    ...(dejaSolo ?? []).map((r) => r.player_id!),
  ]);

  return (matches ?? []).filter((p) => !dejaInscritIds.has(p.id)).slice(0, 8);
}

/**
 * Supprime définitivement une fiche joueur — uniquement si elle n'a
 * jamais servi à rien : aucun compte, aucune équipe, aucune inscription
 * solo. Ce sont de pures données orphelines (ex. ajoutée par erreur) ;
 * dès qu'un compte existe, la désactivation (bannissement) depuis
 * Utilisateurs est le seul chemin — supprimer casserait ce compte.
 */
export async function supprimerJoueurOrphelin(
  playerId: string,
): Promise<{ error: string } | { success: true }> {
  if (!(await estAdmin())) return { error: "Non autorisé." };

  const service = createServiceClient();

  const { data: joueur } = await service
    .from("players")
    .select("id, user_id")
    .eq("id", playerId)
    .maybeSingle();

  if (!joueur) {
    return { error: "Ce joueur n'existe plus." };
  }
  if (joueur.user_id) {
    return {
      error: "Ce joueur a un compte : désactive-le plutôt depuis la page Utilisateurs.",
    };
  }

  const [{ count: nbEquipes }, { count: nbInscriptions }] = await Promise.all([
    service
      .from("team_players")
      .select("team_id", { count: "exact", head: true })
      .eq("player_id", playerId),
    service
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("player_id", playerId),
  ]);

  if ((nbEquipes ?? 0) > 0 || (nbInscriptions ?? 0) > 0) {
    return { error: "Ce joueur a déjà des inscriptions : impossible de le supprimer." };
  }

  const { error } = await service.from("players").delete().eq("id", playerId);

  if (error) {
    return { error: "Impossible de supprimer ce joueur." };
  }

  revalidatePath(PAGE_PATH);
  return { success: true };
}
