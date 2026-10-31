// Format d'animation d'un tournoi : lu en base (tournaments.format_animation) puis
// résolu par le registre. Les routes et les écrans passent par ici, jamais par une
// fonction du moteur directement.

import type { createClient } from "@/lib/supabase/server";
import { getFormat, type FormatAnimation } from "@/lib/engine/formats";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export async function chargerFormat(supabase: SupabaseServerClient, tournamentId: string): Promise<FormatAnimation> {
  const { data } = await supabase.from("tournaments").select("format_animation").eq("id", tournamentId).single();
  // Un tournoi introuvable est traité par l'appelant ; sans lui on retombe sur la valeur par défaut de la base.
  return getFormat(data?.format_animation ?? "poules_tableau");
}
