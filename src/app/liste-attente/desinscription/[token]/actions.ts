"use server";

import { createServiceClient } from "@/lib/supabase/service";

type ActionResult = { error: string } | { success: true };

/** Supprime la ligne liée au jeton : droit à l'effacement, sans compte ni mot de passe. Idempotent. */
export async function seDesinscrire(token: string): Promise<ActionResult> {
  if (!/^[0-9a-f]{32}$/.test(token)) return { error: "Lien invalide." };
  const { error } = await createServiceClient().from("liste_attente").delete().eq("token_desinscription", token);
  if (error) return { error: "Impossible de te désinscrire pour le moment. Réessaie dans un instant." };
  return { success: true };
}
