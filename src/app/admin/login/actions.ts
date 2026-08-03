"use server";

import { createClient } from "@/lib/supabase/server";

type RequestMagicLinkResult = { error: string } | { success: true };

export async function requestMagicLink(
  _prevState: RequestMagicLinkResult | null,
  formData: FormData,
): Promise<RequestMagicLinkResult> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();

  // Generic error on purpose: never reveal whether ADMIN_EMAIL is configured
  // or whether the submitted address matches it.
  if (!adminEmail || email !== adminEmail) {
    return { error: "Adresse non autorisée." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });

  if (error) {
    return { error: "Impossible d'envoyer le lien. Réessaie dans un instant." };
  }

  return { success: true };
}
