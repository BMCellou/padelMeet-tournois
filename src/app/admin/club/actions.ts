"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const clubSchema = z.object({
  nom: z.string().trim().min(1, "Le nom du club est requis."),
  ville: z.string().trim().optional(),
});

type CreerClubResult = { error: string } | { success: true };

export async function creerClub(
  _prevState: CreerClubResult | null,
  formData: FormData,
): Promise<CreerClubResult> {
  const parsed = clubSchema.safeParse({
    nom: formData.get("nom"),
    ville: formData.get("ville") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("clubs").insert({
    nom: parsed.data.nom,
    ville: parsed.data.ville ?? null,
  });

  if (error) {
    return { error: "Impossible de créer le club." };
  }

  revalidatePath("/admin");
  return { success: true };
}

const modifierClubSchema = z.object({
  clubId: z.string().uuid(),
  nom: z.string().trim().min(1, "Le nom du club est requis."),
  ville: z.string().trim().optional(),
});

type ActionResult = { error: string } | { success: true };

export async function modifierClub(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = modifierClubSchema.safeParse({
    clubId: formData.get("clubId"),
    nom: formData.get("nom"),
    ville: formData.get("ville") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("clubs")
    .update({ nom: parsed.data.nom, ville: parsed.data.ville ?? null })
    .eq("id", parsed.data.clubId);

  if (error) {
    return { error: "Impossible de modifier le club." };
  }

  revalidatePath("/admin");
  return { success: true };
}
