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

  const { error } = await supabase.from("courts").insert({
    club_id: tournoi.club_id,
    nom: parsed.data.nom,
    ordre: count ?? 0,
  });

  if (error) {
    return { error: "Impossible d'ajouter le terrain." };
  }

  revalidatePath(`/admin/tournois/${parsed.data.tournamentId}`);
  return { success: true };
}

export async function supprimerTerrain(courtId: string, tournamentId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("courts").delete().eq("id", courtId);
  revalidatePath(`/admin/tournois/${tournamentId}`);
}
