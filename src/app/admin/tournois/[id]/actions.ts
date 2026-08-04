"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const courtSchema = z.object({
  tournamentId: z.string().uuid(),
  nom: z.string().trim().min(1, "Le nom du terrain est requis."),
});

type AjouterTerrainResult = { error: string } | { success: true };

export async function ajouterTerrain(
  _prevState: AjouterTerrainResult | null,
  formData: FormData,
): Promise<AjouterTerrainResult> {
  const parsed = courtSchema.safeParse({
    tournamentId: formData.get("tournamentId"),
    nom: formData.get("nom"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const { data: tournoi, error: tournoiError } = await supabase
    .from("tournaments")
    .select("club_id")
    .eq("id", parsed.data.tournamentId)
    .single();

  if (tournoiError || !tournoi) {
    return { error: "Tournoi introuvable." };
  }

  const { count } = await supabase
    .from("courts")
    .select("id", { count: "exact", head: true })
    .eq("club_id", tournoi.club_id);

  const { data: court, error } = await supabase
    .from("courts")
    .insert({ club_id: tournoi.club_id, nom: parsed.data.nom, ordre: count ?? 0 })
    .select("id")
    .single();

  if (error || !court) {
    return { error: "Impossible d'ajouter le terrain." };
  }

  // Un terrain qu'on vient de créer depuis un tournoi est utile pour ce
  // tournoi : on le sélectionne directement.
  await supabase
    .from("tournament_courts")
    .insert({ tournament_id: parsed.data.tournamentId, court_id: court.id });

  revalidatePath(`/admin/tournois/${parsed.data.tournamentId}`);
  return { success: true };
}

export async function basculerTerrainTournoi(
  tournamentId: string,
  courtId: string,
  selectionne: boolean,
): Promise<void> {
  const supabase = await createClient();

  if (selectionne) {
    await supabase
      .from("tournament_courts")
      .insert({ tournament_id: tournamentId, court_id: courtId });
  } else {
    await supabase
      .from("tournament_courts")
      .delete()
      .eq("tournament_id", tournamentId)
      .eq("court_id", courtId);
  }

  revalidatePath(`/admin/tournois/${tournamentId}`);
}

export async function supprimerTerrainDuClub(courtId: string, tournamentId: string): Promise<void> {
  const supabase = await createClient();
  // Supprime le terrain du club entier (cascade sur tournament_courts pour
  // tous les tournois), pas seulement de ce tournoi. À utiliser pour
  // corriger un terrain créé par erreur.
  await supabase.from("courts").delete().eq("id", courtId);
  revalidatePath(`/admin/tournois/${tournamentId}`);
}
