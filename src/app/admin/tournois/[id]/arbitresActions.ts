"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { estAdmin } from "@/lib/staff/session";
import { genererMotDePasseProvisoire } from "@/lib/staff/motDePasseProvisoire";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Un mot de passe provisoire n'est généré (et renvoyé) que si l'e-mail
// mène à la création d'un tout nouveau compte — s'il existe déjà, on ne
// touche pas à son mot de passe actuel (voir plus bas).
type ResultatInvitation = { error: string } | { success: true; motDePasseProvisoire: string | null };

const inviterSchema = z.object({
  tournamentId: z.string().uuid(),
  email: z.string().trim().toLowerCase().email("E-mail invalide."),
});

/**
 * Cherche un compte auth existant par e-mail. L'admin API n'a pas de
 * filtre par e-mail direct : on parcourt les pages (large marge, très
 * au-delà de la taille réelle de la base). Utilisé uniquement depuis une
 * action déjà réservée aux admins — jamais depuis un flux self-service
 * (voir src/app/compte/actions.ts, qui vérifie le mot de passe à la
 * place : un admin qui invite n'a pas à connaître celui d'autrui).
 */
async function trouverUtilisateurParEmail(
  service: ReturnType<typeof createServiceClient>,
  email: string,
): Promise<string | null> {
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data) return null;
    const trouve = data.users.find((u) => u.email?.toLowerCase() === email);
    if (trouve) return trouve.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

export async function inviterScoreur(
  _prevState: ResultatInvitation | null,
  formData: FormData,
): Promise<ResultatInvitation> {
  if (!(await estAdmin())) {
    return { error: "Non autorisé." };
  }

  const parsed = inviterSchema.safeParse({
    tournamentId: formData.get("tournamentId"),
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const service = createServiceClient();
  const motDePasseProvisoire = genererMotDePasseProvisoire();

  const { data: cree, error: creationError } = await service.auth.admin.createUser({
    email: parsed.data.email,
    password: motDePasseProvisoire,
    email_confirm: true,
    user_metadata: { must_change_password: true },
  });

  let userId: string;

  if (creationError || !cree.user) {
    const dejaExistant = creationError?.message?.toLowerCase().includes("already");
    if (!dejaExistant) {
      return { error: "Impossible de créer le compte." };
    }

    // Compte déjà existant (admin, participant, ou scoreur d'un autre
    // tournoi) : on lui attribue simplement le rôle en plus, sans
    // toucher à son mot de passe actuel — un seul compte, plusieurs
    // rôles composés.
    const existant = await trouverUtilisateurParEmail(service, parsed.data.email);
    if (!existant) {
      return { error: "Un compte existe déjà avec cet e-mail, mais il n'a pas pu être retrouvé." };
    }
    userId = existant;

    const { data: dejaScoreur } = await service
      .from("memberships")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "scorekeeper")
      .eq("tournament_id", parsed.data.tournamentId)
      .maybeSingle();
    if (dejaScoreur) {
      return { error: "Cette personne est déjà scoreur·se de ce tournoi." };
    }
  } else {
    userId = cree.user.id;
  }

  const { error: membershipError } = await service.from("memberships").insert({
    user_id: userId,
    role: "scorekeeper",
    tournament_id: parsed.data.tournamentId,
  });

  if (membershipError) {
    if (cree.user) await service.auth.admin.deleteUser(cree.user.id);
    return { error: "Impossible d'attribuer le rôle de scoreur." };
  }

  revalidatePath(`/admin/tournois/${parsed.data.tournamentId}`);
  return { success: true, motDePasseProvisoire: cree.user ? motDePasseProvisoire : null };
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
