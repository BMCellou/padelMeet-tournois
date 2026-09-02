"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { estAdmin } from "@/lib/staff/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";

type ActionResult = { error: string } | { success: true };

const inviterSchema = z.object({
  tournamentId: z.string().uuid(),
  email: z.string().trim().toLowerCase().email("E-mail invalide."),
  password: z.string().min(8, "Le mot de passe doit faire au moins 8 caractères."),
});

export async function inviterScoreur(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await estAdmin())) {
    return { error: "Non autorisé." };
  }

  const parsed = inviterSchema.safeParse({
    tournamentId: formData.get("tournamentId"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const service = createServiceClient();

  const { data: cree, error: creationError } = await service.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
  });

  if (creationError || !cree.user) {
    const dejaExistant = creationError?.message?.toLowerCase().includes("already");
    return {
      error: dejaExistant
        ? "Un compte existe déjà avec cet e-mail : utilise une autre adresse pour ce/cette scoreur·se."
        : "Impossible de créer le compte.",
    };
  }

  const { error: membershipError } = await service.from("memberships").insert({
    user_id: cree.user.id,
    role: "scorekeeper",
    tournament_id: parsed.data.tournamentId,
  });

  if (membershipError) {
    await service.auth.admin.deleteUser(cree.user.id);
    return { error: "Impossible d'attribuer le rôle de scoreur." };
  }

  revalidatePath(`/admin/tournois/${parsed.data.tournamentId}`);
  return { success: true };
}

export async function retirerScoreur(membershipId: string, tournamentId: string): Promise<void> {
  if (!(await estAdmin())) return;

  const service = createServiceClient();
  // On retire uniquement le rôle : le compte lui-même n'est pas supprimé,
  // il pourrait être scoreur d'un autre tournoi ou redevenir un simple
  // participant.
  await service.from("memberships").delete().eq("id", membershipId);
  revalidatePath(`/admin/tournois/${tournamentId}`);
}
