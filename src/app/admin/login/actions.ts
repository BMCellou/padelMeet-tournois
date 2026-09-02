"use server";

import { createClient } from "@/lib/supabase/server";
import { getRolesStaff } from "@/lib/staff/session";
import { redirect } from "next/navigation";

type ActionResult = { error: string } | { success: true };

export async function connexion(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Identifiants invalides." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Identifiants invalides." };
  }

  // L'authentification a réussi, mais seul un compte staff (admin ou
  // scoreur) a sa place ici — un participant qui se serait trompé de
  // formulaire ne doit pas rester connecté sur cet espace.
  const roles = await getRolesStaff();
  const admin = roles.find((r) => r.role === "admin");
  const scoreur = roles.find((r) => r.role === "scorekeeper");

  if (!admin && !scoreur) {
    await supabase.auth.signOut();
    return { error: "Identifiants invalides." };
  }

  redirect(admin ? "/admin" : `/admin/tournois/${scoreur!.tournamentId}/scores`);
}

export async function demanderReinitialisation(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email) {
    return { error: "Adresse invalide." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
  });

  // Toujours "success" côté message, y compris si l'e-mail n'existe pas
  // ou n'est pas staff : on ne révèle jamais quels comptes existent.
  if (error) {
    return { error: "Impossible d'envoyer le lien. Réessaie dans un instant." };
  }

  return { success: true };
}
