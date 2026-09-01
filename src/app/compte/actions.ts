"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getParticipantConnecte } from "@/lib/participant/session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

type ActionResult = { error: string } | { success: true };

function urlSuivante(formData: FormData): string {
  const next = String(formData.get("next") ?? "");
  // On ne redirige que vers une route interne : jamais vers une URL
  // absolue transmise par le client (open redirect).
  return next.startsWith("/") ? next : "/compte";
}

const inscriptionSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail invalide."),
  password: z.string().min(8, "Le mot de passe doit faire au moins 8 caractères."),
  nom: z.string().trim().min(1, "Le nom est requis."),
  prenom: z.string().trim().min(1, "Le prénom est requis."),
  sexe: z.enum(["H", "F"]).optional(),
  telephone: z.string().trim().optional(),
  classementFft: z.string().trim().optional(),
});

export async function inscription(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = inscriptionSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
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

  const { data: cree, error: creationError } = await service.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
  });

  if (creationError || !cree.user) {
    const dejaExistant = creationError?.message?.toLowerCase().includes("already");
    return {
      error: dejaExistant
        ? "Un compte existe déjà avec cet e-mail. Connecte-toi plutôt."
        : "Impossible de créer le compte.",
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
    return { error: "Impossible de créer le profil joueur." };
  }

  const supabase = await createClient();
  const { error: connexionError } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (connexionError) {
    redirect("/compte/connexion");
  }

  redirect(urlSuivante(formData));
}

const connexionSchema = z.object({
  email: z.string().trim().toLowerCase(),
  password: z.string().min(1),
});

export async function connexion(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = connexionSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success || !parsed.data.email || !parsed.data.password) {
    return { error: "Identifiants invalides." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: "Identifiants invalides." };
  }

  redirect(urlSuivante(formData));
}

export async function deconnexion(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/compte/connexion");
}

const profilSchema = z.object({
  nom: z.string().trim().min(1, "Le nom est requis."),
  prenom: z.string().trim().min(1, "Le prénom est requis."),
  sexe: z.enum(["H", "F"]).optional(),
  telephone: z.string().trim().optional(),
  classementFft: z.string().trim().optional(),
});

export async function modifierMonProfil(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const participant = await getParticipantConnecte();
  if (!participant) {
    return { error: "Connecte-toi d'abord." };
  }

  const parsed = profilSchema.safeParse({
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
    .eq("id", participant.playerId);

  if (error) {
    return { error: "Impossible de mettre à jour le profil." };
  }

  revalidatePath("/compte");
  return { success: true };
}
