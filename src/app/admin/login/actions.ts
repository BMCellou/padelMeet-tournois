"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type ActionResult = { error: string } | { success: true };

function adminEmailAutorise(email: string): boolean {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  return !!adminEmail && email === adminEmail;
}

export async function connexion(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  // Message générique volontaire : ne révèle jamais si l'adresse est
  // autorisée ou si le mot de passe est incorrect.
  if (!adminEmailAutorise(email) || !password) {
    return { error: "Identifiants invalides." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Identifiants invalides." };
  }

  redirect("/admin");
}

export async function demanderReinitialisation(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!adminEmailAutorise(email)) {
    return { error: "Adresse non autorisée." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
  });

  if (error) {
    return { error: "Impossible d'envoyer le lien. Réessaie dans un instant." };
  }

  return { success: true };
}
