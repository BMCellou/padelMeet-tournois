"use server";

import { revalidatePath } from "next/cache";
import { estAdmin } from "@/lib/staff/session";
import { createServiceClient } from "@/lib/supabase/service";
import { creerBackup, purgerAnciennesBackups } from "@/lib/backup/service";

type Resultat = { error: string } | { success: true; message: string };

/** service_role : lire toutes les tables sans restriction RLS, comme le
 * cron — mais déclenché ici à la main par un admin authentifié (vérifié
 * juste au-dessus), jamais sur la seule foi d'une requête cliente. */
export async function lancerBackupManuel(): Promise<Resultat> {
  if (!(await estAdmin())) return { error: "Non autorisé." };

  const supabase = createServiceClient();
  try {
    const resultat = await creerBackup(supabase);
    await purgerAnciennesBackups(supabase);
    revalidatePath("/admin/sauvegardes");
    return {
      success: true,
      message: `Sauvegarde créée : ${resultat.chemin} (${resultat.nombreLignes} lignes, ${(resultat.tailleOctets / 1024).toFixed(0)} Ko).`,
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Échec de la sauvegarde." };
  }
}
