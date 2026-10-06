// Recopie le format propre à chaque phase (tournaments.format_par_phase)
// dans matches.format_override des matchs qui n'ont pas encore commencé.
// À appeler après toute modification de ces formats et après toute
// (ré)génération de matchs (calendrier des poules, tableau final), pour
// que les nouveaux matchs héritent du réglage du tournoi.

import type { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import {
  PHASES_FORMAT,
  dernierTourTableau,
  matchCommence,
  phaseDuMatch,
  type FormatsParPhase,
  type PhaseFormat,
} from "@/lib/engine/formatPhases";

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
  const dernier = dernierTourTableau(matchs);

  const idsParPhase = new Map<PhaseFormat, string[]>();
  for (const m of matchs) {
    if (matchCommence(m.statut)) continue;
    const phase = phaseDuMatch(m, dernier);
    if (!phase) continue;
    idsParPhase.set(phase, [...(idsParPhase.get(phase) ?? []), m.id]);
  }

  for (const phase of PHASES_FORMAT) {
    const ids = idsParPhase.get(phase);
    if (!ids || ids.length === 0) continue;
    const format = formats[phase];
    await supabase
      .from("matches")
      .update({ format_override: format ? (format as unknown as Json) : null })
      .in("id", ids);
  }
}
