"use server";

import { createClient } from "@/lib/supabase/server";
import { calculerRepartitionPoules } from "@/lib/engine/poules";
import { tirerAuSort, type EquipeAvecSeed } from "@/lib/engine/tirage";
import { creerRng } from "@/lib/engine/rng";
import { revalidatePath } from "next/cache";
import { randomInt } from "crypto";
import { z } from "zod";

type ActionResult = { error: string } | { success: true };

async function matchsExistent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tournamentId: string,
): Promise<boolean> {
  const { count } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournamentId)
    .eq("phase", "poule");
  return (count ?? 0) > 0;
}

async function scoresDejaSaisis(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tournamentId: string,
): Promise<boolean> {
  const { data: matchs } = await supabase
    .from("matches")
    .select("id, statut")
    .eq("tournament_id", tournamentId)
    .eq("phase", "poule");
  return (matchs ?? []).some((m) => m.statut !== "a_venir");
}

const tirageSchema = z.object({
  tournamentId: z.string().uuid(),
  nombrePoulesForce: z.coerce.number().int().positive().optional(),
});

export async function tirerPoules(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = tirageSchema.safeParse({
    tournamentId: formData.get("tournamentId"),
    nombrePoulesForce: formData.get("nombrePoulesForce") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { tournamentId, nombrePoulesForce } = parsed.data;
  const supabase = await createClient();

  if (await scoresDejaSaisis(supabase, tournamentId)) {
    return { error: "Des scores ont déjà été saisis : impossible de relancer le tirage." };
  }

  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id, seed")
    .eq("tournament_id", tournamentId);

  if (teamsError || !teams) {
    return { error: "Impossible de charger les équipes." };
  }

  let repartition;
  try {
    repartition = calculerRepartitionPoules(teams.length, { nombrePoulesForce });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Répartition impossible." };
  }

  const equipes: EquipeAvecSeed[] = teams.map((t) => ({ id: t.id, seed: t.seed }));
  const seed = randomInt(1, 2_147_483_647);
  const tirage = tirerAuSort(equipes, repartition.tailles, creerRng(seed));

  // Relance : on repart d'un état propre. Un calendrier a pu être généré
  // depuis le premier tirage (matches liés aux anciennes poules) : on le
  // supprime aussi, il faudra le régénérer depuis l'écran calendrier.
  await supabase.from("matches").delete().eq("tournament_id", tournamentId).eq("phase", "poule");
  await supabase.from("groups").delete().eq("tournament_id", tournamentId);

  for (const [index, poule] of tirage.poules.entries()) {
    const { data: groupe, error: groupeError } = await supabase
      .from("groups")
      .insert({ tournament_id: tournamentId, nom: poule.nom, ordre: index })
      .select("id")
      .single();

    if (groupeError || !groupe) {
      return { error: "Impossible de créer les poules." };
    }

    const { error: gtError } = await supabase.from("group_teams").insert(
      poule.equipeIds.map((teamId, position) => ({
        group_id: groupe.id,
        team_id: teamId,
        position_tirage: position,
      })),
    );

    if (gtError) {
      return { error: "Impossible de placer les équipes dans les poules." };
    }
  }

  await supabase.from("tournaments").update({ tirage_seed: seed }).eq("id", tournamentId);

  revalidatePath(`/admin/tournois/${tournamentId}/poules`);
  revalidatePath(`/admin/tournois/${tournamentId}/calendrier`);
  return { success: true };
}

const seedSchema = z.object({
  teamId: z.string().uuid(),
  tournamentId: z.string().uuid(),
  seed: z
    .string()
    .transform((v) => (v.trim() === "" ? null : Number(v)))
    .nullable(),
});

export async function definirSeed(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = seedSchema.safeParse({
    teamId: formData.get("teamId"),
    tournamentId: formData.get("tournamentId"),
    seed: formData.get("seed") ?? "",
  });

  if (!parsed.success) {
    return { error: "Tête de série invalide." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("teams")
    .update({ seed: parsed.data.seed })
    .eq("id", parsed.data.teamId);

  if (error) {
    return { error: "Impossible d'enregistrer la tête de série." };
  }

  revalidatePath(`/admin/tournois/${parsed.data.tournamentId}/poules`);
  return { success: true };
}

export async function deplacerEquipe(
  tournamentId: string,
  teamId: string,
  targetGroupId: string,
): Promise<void> {
  const supabase = await createClient();

  if (await matchsExistent(supabase, tournamentId)) {
    return;
  }

  await supabase.from("group_teams").update({ group_id: targetGroupId }).eq("team_id", teamId);
  revalidatePath(`/admin/tournois/${tournamentId}/poules`);
}
