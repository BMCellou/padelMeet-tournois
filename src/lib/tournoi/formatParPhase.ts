// Recopie le format propre à chaque phase (tournaments.format_par_phase)
// dans matches.format_override des matchs qui n'ont pas encore commencé.
// À appeler après toute modification de ces formats et après toute
// (ré)génération de matchs (calendrier des poules, tableau final), pour
// que les nouveaux matchs héritent du réglage du tournoi.

import type { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import { matchCommence, type FormatsParPhase, type PhaseFormat } from "@/lib/engine/formatPhases";
import { chargerFormat } from "./formatAnimation";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export async function appliquerFormatsParPhase(
  supabase: SupabaseServerClient,
  tournamentId: string,
): Promise<void> {
  const [{ data: tournoi }, { data: matchs }] = await Promise.all([
    supabase.from("tournaments").select("format_par_phase").eq("id", tournamentId).single(),
    supabase.from("matches").select("id, phase, round, statut").eq("tournament_id", tournamentId),
  ]);
  if (!tournoi || !matchs) return;

  const formats = (tournoi.format_par_phase ?? {}) as FormatsParPhase;
  // Les phases et le rangement des matchs viennent du format du tournoi.
  const format = await chargerFormat(supabase, tournamentId);
  const phaseDe = format.resoudrePhases(matchs);

  const idsParPhase = new Map<PhaseFormat, string[]>();
  for (const m of matchs) {
    if (matchCommence(m.statut)) continue;
    const phase = phaseDe(m);
    if (!phase) continue;
    idsParPhase.set(phase, [...(idsParPhase.get(phase) ?? []), m.id]);
  }

  for (const { code: phase } of format.phases) {
    const ids = idsParPhase.get(phase);
    if (!ids || ids.length === 0) continue;
    const formatDePhase = formats[phase];
    await supabase
      .from("matches")
      .update({ format_override: formatDePhase ? (formatDePhase as unknown as Json) : null })
      .in("id", ids);
  }
}
