"use server";

import { createClient } from "@/lib/supabase/server";
import { genererTours } from "@/lib/engine/tours";
import { planifier, type MatchAPlanifier } from "@/lib/engine/planification";
import { heureLocaleVersISO } from "@/lib/temps";
import { revalidatePath } from "next/cache";
import { z } from "zod";

type ActionResult = { error: string } | { success: true };

const genererSchema = z.object({
  tournamentId: z.string().uuid(),
  heureDebut: z.string().regex(/^\d{2}:\d{2}$/, "Heure invalide."),
  dureeJeuMin: z.coerce.number().int().positive(),
  rotationMin: z.coerce.number().int().nonnegative(),
  reposMinMin: z.coerce.number().int().nonnegative(),
});

export async function genererCalendrier(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = genererSchema.safeParse({
    tournamentId: formData.get("tournamentId"),
    heureDebut: formData.get("heureDebut"),
    dureeJeuMin: formData.get("dureeJeuMin"),
    rotationMin: formData.get("rotationMin"),
    reposMinMin: formData.get("reposMinMin"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { tournamentId, heureDebut, dureeJeuMin, rotationMin, reposMinMin } = parsed.data;
  const supabase = await createClient();

  const { data: tournoi, error: tournoiError } = await supabase
    .from("tournaments")
    .select("id, date, club_id")
    .eq("id", tournamentId)
    .single();

  if (tournoiError || !tournoi) {
    return { error: "Tournoi introuvable." };
  }

  const { data: matchsExistants } = await supabase
    .from("matches")
    .select("id, statut")
    .eq("tournament_id", tournamentId)
    .eq("phase", "poule");

  if (matchsExistants?.some((m) => m.statut !== "a_venir")) {
    return {
      error: "Des scores ont déjà été saisis : impossible de régénérer le calendrier.",
    };
  }

  const { data: terrainsLies } = await supabase
    .from("tournament_courts")
    .select("courts(id, ordre)")
    .eq("tournament_id", tournamentId);

  const courts = (terrainsLies ?? [])
    .map((t) => t.courts)
    .filter((c): c is { id: string; ordre: number } => !!c)
    .sort((a, b) => a.ordre - b.ordre);

  if (courts.length === 0) {
    return {
      error: "Sélectionne au moins un terrain pour ce tournoi avant de générer le calendrier.",
    };
  }

  const { data: groupes, error: groupesError } = await supabase
    .from("groups")
    .select("id, group_teams(team_id, position_tirage)")
    .eq("tournament_id", tournamentId)
    .order("ordre");

  if (groupesError || !groupes || groupes.length === 0) {
    return { error: "Tire d'abord les poules avant de générer le calendrier." };
  }

  if (matchsExistants && matchsExistants.length > 0) {
    await supabase.from("matches").delete().eq("tournament_id", tournamentId).eq("phase", "poule");
  }

  const matchesAInserer: {
    tournament_id: string;
    phase: "poule";
    group_id: string;
    round: number;
    team_a_id: string;
    team_b_id: string;
    statut: "a_venir";
  }[] = [];

  for (const groupe of groupes) {
    const equipeIds = [...groupe.group_teams]
      .sort((a, b) => (a.position_tirage ?? 0) - (b.position_tirage ?? 0))
      .map((gt) => gt.team_id);

    if (equipeIds.length < 2) continue;

    const tours = genererTours(equipeIds);
    for (const tour of tours) {
      for (const [teamAId, teamBId] of tour.rencontres) {
        matchesAInserer.push({
          tournament_id: tournamentId,
          phase: "poule",
          group_id: groupe.id,
          round: tour.numero,
          team_a_id: teamAId,
          team_b_id: teamBId,
          statut: "a_venir",
        });
      }
    }
  }

  if (matchesAInserer.length === 0) {
    return { error: "Aucun match à planifier (poules vides)." };
  }

  const { data: matchesInseres, error: insertError } = await supabase
    .from("matches")
    .insert(matchesAInserer)
    .select("id, group_id, round, team_a_id, team_b_id");

  if (insertError || !matchesInseres) {
    return { error: "Impossible de créer les matchs." };
  }

  const aPlanifier: MatchAPlanifier[] = matchesInseres.map((m) => ({
    id: m.id,
    groupId: m.group_id,
    round: m.round,
    teamAId: m.team_a_id!,
    teamBId: m.team_b_id!,
  }));

  const planning = planifier(
    aPlanifier,
    courts.map((c) => ({ id: c.id, ordre: c.ordre })),
    {
      heureDebut: heureLocaleVersISO(tournoi.date, heureDebut),
      dureeJeuMin,
      rotationMin,
      reposMinMin,
    },
  );

  for (const p of planning) {
    await supabase
      .from("matches")
      .update({ court_id: p.courtId, scheduled_at: p.debut, duree_estimee: dureeJeuMin })
      .eq("id", p.matchId);
  }

  await supabase
    .from("tournaments")
    .update({ heure_debut: heureDebut, duree_match_min: dureeJeuMin, pause_min: rotationMin, repos_min_min: reposMinMin })
    .eq("id", tournamentId);

  revalidatePath(`/admin/tournois/${tournamentId}/calendrier`);
  return { success: true };
}

export async function deplacerMatch(
  tournamentId: string,
  matchId: string,
  courtId: string,
  scheduledAtISO: string,
): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("matches")
    .update({ court_id: courtId, scheduled_at: scheduledAtISO })
    .eq("id", matchId)
    .eq("tournament_id", tournamentId);

  revalidatePath(`/admin/tournois/${tournamentId}/calendrier`);
}
