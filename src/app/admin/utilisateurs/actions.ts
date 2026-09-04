"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { estAdmin } from "@/lib/staff/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";

type ActionResult = { error: string } | { success: true };

const PAGE_PATH = "/admin/utilisateurs";

/** Nombre d'admins actifs (non désactivés) — sert aux garde-fous
 * anti-auto-verrouillage ci-dessous. */
async function compterAdminsActifs(
  service: ReturnType<typeof createServiceClient>,
): Promise<number> {
  const { data: adminsRows } = await service
    .from("memberships")
    .select("user_id")
    .eq("role", "admin");

  let actifs = 0;
  for (const row of adminsRows ?? []) {
    const { data } = await service.auth.admin.getUserById(row.user_id);
    const banni = !!data.user?.banned_until && new Date(data.user.banned_until) > new Date();
    if (!banni) actifs++;
  }
  return actifs;
}

const creerSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail invalide."),
  password: z.string().min(8, "Le mot de passe doit faire au moins 8 caractères."),
  nom: z.string().trim().min(1, "Le nom est requis."),
  prenom: z.string().trim().min(1, "Le prénom est requis."),
  sexe: z.enum(["H", "F"]).optional(),
  telephone: z.string().trim().optional(),
  role: z.enum(["aucun", "admin", "scorekeeper"]),
  tournamentId: z.string().uuid().optional(),
});

export async function creerUtilisateur(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await estAdmin())) return { error: "Non autorisé." };

  const parsed = creerSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    nom: formData.get("nom"),
    prenom: formData.get("prenom"),
    sexe: formData.get("sexe") || undefined,
    telephone: formData.get("telephone") || undefined,
    role: formData.get("role") || "aucun",
    tournamentId: formData.get("tournamentId") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  if (parsed.data.role === "scorekeeper" && !parsed.data.tournamentId) {
    return { error: "Choisis le tournoi de ce/cette scoreur·se." };
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
      error: dejaExistant ? "Un compte existe déjà avec cet e-mail." : "Impossible de créer le compte.",
    };
  }

  const { error: joueurError } = await service.from("players").insert({
    user_id: cree.user.id,
    nom: parsed.data.nom,
    prenom: parsed.data.prenom,
    sexe: parsed.data.sexe,
    telephone: parsed.data.telephone,
    email: parsed.data.email,
  });

  if (joueurError) {
    await service.auth.admin.deleteUser(cree.user.id);
    return { error: "Impossible de créer le profil." };
  }

  if (parsed.data.role !== "aucun") {
    const { error: membershipError } = await service.from("memberships").insert({
      user_id: cree.user.id,
      role: parsed.data.role,
      tournament_id: parsed.data.role === "scorekeeper" ? parsed.data.tournamentId : null,
    });
    if (membershipError) {
      return { error: "Compte créé, mais impossible d'attribuer le rôle." };
    }
  }

  revalidatePath(PAGE_PATH);
  return { success: true };
}

const modifierProfilSchema = z.object({
  playerId: z.string().uuid(),
  nom: z.string().trim().min(1, "Le nom est requis."),
  prenom: z.string().trim().min(1, "Le prénom est requis."),
  sexe: z.enum(["H", "F"]).optional(),
  telephone: z.string().trim().optional(),
  classementFft: z.string().trim().optional(),
});

export async function modifierProfilUtilisateur(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await estAdmin())) return { error: "Non autorisé." };

  const parsed = modifierProfilSchema.safeParse({
    playerId: formData.get("playerId"),
    nom: formData.get("nom"),
    prenom: formData.get("prenom"),
    sexe: formData.get("sexe") || undefined,
    telephone: formData.get("telephone") || undefined,
    classementFft: formData.get("classementFft") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const service = createServiceClient();
  const { error } = await service
    .from("players")
    .update({
      nom: parsed.data.nom,
      prenom: parsed.data.prenom,
      sexe: parsed.data.sexe,
      telephone: parsed.data.telephone,
      classement_fft: parsed.data.classementFft,
    })
    .eq("id", parsed.data.playerId);

  if (error) {
    return { error: "Impossible de modifier ce profil." };
  }

  revalidatePath(PAGE_PATH);
  return { success: true };
}

const creerDepuisJoueurSchema = z.object({
  playerId: z.string().uuid(),
  email: z.string().trim().toLowerCase().email("E-mail invalide."),
  password: z.string().min(8, "Le mot de passe doit faire au moins 8 caractères."),
  role: z.enum(["aucun", "admin", "scorekeeper"]),
  tournamentId: z.string().uuid().optional(),
});

/**
 * Crée un compte pour un joueur déjà inscrit (donc déjà présent dans
 * `players`, avec ses équipes/inscriptions) mais sans compte auth —
 * le cas classique du/de la partenaire saisi·e à la main lors d'une
 * inscription en paire, ou d'un joueur ajouté directement par un admin.
 * On NE crée PAS une nouvelle fiche joueur : on rattache le compte créé
 * à la fiche existante (user_id), pour ne perdre ni son historique ni
 * ses équipes.
 */
export async function creerCompteDepuisJoueur(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await estAdmin())) return { error: "Non autorisé." };

  const parsed = creerDepuisJoueurSchema.safeParse({
    playerId: formData.get("playerId"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role") || "aucun",
    tournamentId: formData.get("tournamentId") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  if (parsed.data.role === "scorekeeper" && !parsed.data.tournamentId) {
    return { error: "Choisis le tournoi de ce/cette scoreur·se." };
  }

  const service = createServiceClient();

  const { data: joueur } = await service
    .from("players")
    .select("id, user_id")
    .eq("id", parsed.data.playerId)
    .maybeSingle();

  if (!joueur) {
    return { error: "Ce joueur n'existe plus." };
  }
  if (joueur.user_id) {
    return { error: "Ce joueur a déjà un compte." };
  }

  const { data: cree, error: creationError } = await service.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
  });

  if (creationError || !cree.user) {
    const dejaExistant = creationError?.message?.toLowerCase().includes("already");
    return {
      error: dejaExistant ? "Un compte existe déjà avec cet e-mail." : "Impossible de créer le compte.",
    };
  }

  const { error: liaisonError } = await service
    .from("players")
    .update({ user_id: cree.user.id, email: parsed.data.email })
    .eq("id", parsed.data.playerId);

  if (liaisonError) {
    await service.auth.admin.deleteUser(cree.user.id);
    return { error: "Impossible de rattacher le compte à ce joueur." };
  }

  if (parsed.data.role !== "aucun") {
    const { error: membershipError } = await service.from("memberships").insert({
      user_id: cree.user.id,
      role: parsed.data.role,
      tournament_id: parsed.data.role === "scorekeeper" ? parsed.data.tournamentId : null,
    });
    if (membershipError) {
      return { error: "Compte créé, mais impossible d'attribuer le rôle." };
    }
  }

  revalidatePath(PAGE_PATH);
  return { success: true };
}

const ajouterRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["admin", "scorekeeper"]),
  tournamentId: z.string().uuid().optional(),
});

export async function ajouterRole(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await estAdmin())) return { error: "Non autorisé." };

  const parsed = ajouterRoleSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
    tournamentId: formData.get("tournamentId") || undefined,
  });

  if (!parsed.success) {
    return { error: "Rôle invalide." };
  }

  if (parsed.data.role === "scorekeeper" && !parsed.data.tournamentId) {
    return { error: "Choisis le tournoi de ce/cette scoreur·se." };
  }

  const service = createServiceClient();

  let requeteExistant = service
    .from("memberships")
    .select("id")
    .eq("user_id", parsed.data.userId)
    .eq("role", parsed.data.role);
  requeteExistant =
    parsed.data.role === "scorekeeper"
      ? requeteExistant.eq("tournament_id", parsed.data.tournamentId!)
      : requeteExistant;
  const { data: existant } = await requeteExistant.maybeSingle();

  if (existant) {
    return {
      error:
        parsed.data.role === "admin"
          ? "Cette personne est déjà admin."
          : "Cette personne a déjà ce rôle pour ce tournoi.",
    };
  }

  const { error } = await service.from("memberships").insert({
    user_id: parsed.data.userId,
    role: parsed.data.role,
    tournament_id: parsed.data.role === "scorekeeper" ? parsed.data.tournamentId : null,
  });

  if (error) {
    return { error: "Impossible d'attribuer ce rôle." };
  }

  revalidatePath(PAGE_PATH);
  return { success: true };
}

export async function retirerRole(membershipId: string, role: string): Promise<{ error: string } | { success: true }> {
  if (!(await estAdmin())) return { error: "Non autorisé." };

  const service = createServiceClient();

  if (role === "admin") {
    const nbActifs = await compterAdminsActifs(service);
    if (nbActifs <= 1) {
      return { error: "Impossible de retirer le dernier compte admin actif." };
    }
  }

  await service.from("memberships").delete().eq("id", membershipId);
  revalidatePath(PAGE_PATH);
  return { success: true };
}

export async function basculerActivation(
  userId: string,
  activer: boolean,
): Promise<{ error: string } | { success: true }> {
  if (!(await estAdmin())) return { error: "Non autorisé." };

  const supabase = await createClient();
  const {
    data: { user: appelant },
  } = await supabase.auth.getUser();

  if (!activer && appelant?.id === userId) {
    return { error: "Tu ne peux pas désactiver ton propre compte." };
  }

  const service = createServiceClient();

  if (!activer) {
    const { data: rolesDeCeProfil } = await service
      .from("memberships")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin");

    if ((rolesDeCeProfil ?? []).length > 0) {
      const nbActifs = await compterAdminsActifs(service);
      if (nbActifs <= 1) {
        return { error: "Impossible de désactiver le dernier compte admin actif." };
      }
    }
  }

  const { error } = await service.auth.admin.updateUserById(userId, {
    ban_duration: activer ? "none" : "876000h",
  });

  if (error) {
    return { error: "Impossible de mettre à jour ce compte." };
  }

  revalidatePath(PAGE_PATH);
  return { success: true };
}
