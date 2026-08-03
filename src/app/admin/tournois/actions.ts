"use server";

import { createClient } from "@/lib/supabase/server";
import { FORMAT_PAR_DEFAUT } from "@/lib/engine/types";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { z } from "zod";

const tournamentSchema = z.object({
  nom: z.string().trim().min(1, "Le nom du tournoi est requis."),
  date: z.string().min(1, "La date est requise."),
  genre: z.enum(["masculin", "feminin", "mixte"]).optional(),
  niveau: z.string().trim().optional(),
  nbQualifies: z.coerce.number().int().positive(),
  dureeMatchMin: z.coerce.number().int().positive(),
  pauseMin: z.coerce.number().int().nonnegative(),
});

type CreerTournoiResult = { error: string } | { success: true; tournamentId: string };

function genererSlugPublic(): string {
  return randomUUID().replace(/-/g, "").slice(0, 12);
}

export async function creerTournoi(
  _prevState: CreerTournoiResult | null,
  formData: FormData,
): Promise<CreerTournoiResult> {
  const parsed = tournamentSchema.safeParse({
    nom: formData.get("nom"),
    date: formData.get("date"),
    genre: formData.get("genre") || undefined,
    niveau: formData.get("niveau") || undefined,
    nbQualifies: formData.get("nbQualifies"),
    dureeMatchMin: formData.get("dureeMatchMin"),
    pauseMin: formData.get("pauseMin"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .select("id")
    .limit(1)
    .single();

  if (clubError || !club) {
    return { error: "Aucun club trouvé. Recharge la page." };
  }

  const { data, error } = await supabase
    .from("tournaments")
    .insert({
      club_id: club.id,
      nom: parsed.data.nom,
      date: parsed.data.date,
      genre: parsed.data.genre,
      niveau: parsed.data.niveau,
      nb_qualifies: parsed.data.nbQualifies,
      duree_match_min: parsed.data.dureeMatchMin,
      pause_min: parsed.data.pauseMin,
      public_slug: genererSlugPublic(),
      format_config: FORMAT_PAR_DEFAUT,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Impossible de créer le tournoi." };
  }

  redirect(`/admin/tournois/${data.id}`);
}
