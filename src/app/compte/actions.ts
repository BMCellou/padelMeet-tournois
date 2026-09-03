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
  const supabase = await createClient();

  // Un compte admin/scoreur peut aussi être joueur : un seul compte, deux
  // rôles composés (jamais deux comptes pour le même e-mail — Supabase
  // Auth l'interdit de toute façon). On vérifie que c'est bien la même
  // personne en tentant la connexion avec le mot de passe fourni : si ça
  // marche, on rattache le profil joueur à ce compte existant plutôt que
  // d'échouer.
  const dejaConnecte = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  let userId: string;
  let vientDetreCree = false;

  if (dejaConnecte.data.user) {
    userId = dejaConnecte.data.user.id;
    const { data: profilExistant } = await service
      .from("players")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (profilExistant) {
      return { error: "Ce compte a déjà un profil joueur : connecte-toi plutôt." };
    }
  } else {
    const { data: cree, error: creationError } = await service.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
    });

    if (creationError || !cree.user) {
      const dejaExistant = creationError?.message?.toLowerCase().includes("already");
      return {
        error: dejaExistant
          ? "Un compte existe déjà avec cet e-mail, mais ce mot de passe ne correspond pas. Connecte-toi avec le bon mot de passe pour associer ton profil joueur, ou utilise « mot de passe oublié »."
          : "Impossible de créer le compte.",
      };
    }
    userId = cree.user.id;
    vientDetreCree = true;
  }

  const { error: joueurError } = await service.from("players").insert({
    user_id: userId,
    nom: parsed.data.nom,
    prenom: parsed.data.prenom,
    sexe: parsed.data.sexe,
    telephone: parsed.data.telephone,
    email: parsed.data.email,
  });

  if (joueurError) {
    if (vientDetreCree) await service.auth.admin.deleteUser(userId);
    return { error: "Impossible de créer le profil joueur." };
  }

  if (vientDetreCree) {
    const { error: connexionError } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    if (connexionError) {
      redirect("/compte/connexion");
    }
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
