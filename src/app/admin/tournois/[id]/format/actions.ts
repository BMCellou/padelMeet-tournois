"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { estAdmin } from "@/lib/staff/session";
import { FORMAT_PAR_DEFAUT, type MatchFormat } from "@/lib/engine/types";
import { memeFormat, validerDepartage, validerFormat } from "@/lib/engine/formatMatch";
import {
  PHASES_FORMAT,
  LIBELLES_PHASES,
  calculerVerrous,
  validerFormatsParPhase,
  type FormatsParPhase,
  type PhaseFormat,
} from "@/lib/engine/formatPhases";
import { appliquerFormatsParPhase } from "@/lib/tournoi/formatParPhase";
import type { Json } from "@/lib/supabase/database.types";

/** `inchange` : rien n'a été écrit car la valeur envoyée est déjà celle de la base. */
type Resultat = { error: string } | { success: true; inchange?: true };

const idSchema = z.string().uuid();

async function charger(tournamentId: string) {
  const supabase = await createClient();
  const [{ data: tournoi }, { data: matchs }] = await Promise.all([
    supabase
      .from("tournaments")
      .select("id, format_config, format_par_phase, tiebreak_rules")
      .eq("id", tournamentId)
      .single(),
    supabase.from("matches").select("phase, round, statut").eq("tournament_id", tournamentId),
  ]);
  if (!tournoi) return null;

  const formatsActuels = (tournoi.format_par_phase ?? {}) as FormatsParPhase;
  const verrous = calculerVerrous(matchs ?? [], new Set(Object.keys(formatsActuels) as PhaseFormat[]));
  const formatDefautActuel: MatchFormat = { ...FORMAT_PAR_DEFAUT, ...(tournoi.format_config as object as Partial<MatchFormat>) };
  return { supabase, tournoi, formatsActuels, formatDefautActuel, verrous };
}

async function tracer(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tournamentId: string,
  action: string,
  payload: unknown,
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase.from("audit_log").insert({
    tournament_id: tournamentId,
    acteur: user?.email ?? "admin",
    action,
    payload: payload as Json,
  });
}

function rafraichir(tournamentId: string) {
  revalidatePath(`/admin/tournois/${tournamentId}/format`);
  revalidatePath(`/admin/tournois/${tournamentId}/scores`);
  revalidatePath(`/admin/tournois/${tournamentId}/tableau`);
}

export async function enregistrerFormatDefaut(tournamentId: string, brut: unknown): Promise<Resultat> {
  if (!(await estAdmin())) return { error: "Non autorisé." };
  if (!idSchema.safeParse(tournamentId).success) return { error: "Requête invalide." };

  const valide = validerFormat(brut);
  if (!valide.ok) return { error: valide.erreurs.join(" ") };

  const ctx = await charger(tournamentId);
  if (!ctx) return { error: "Tournoi introuvable." };

  if (memeFormat(valide.format, ctx.formatDefautActuel)) return { success: true, inchange: true };
  if (ctx.verrous.defaut.verrouille) return { error: ctx.verrous.defaut.raison! };

  const { error } = await ctx.supabase
    .from("tournaments")
    .update({ format_config: valide.format as unknown as Json })
    .eq("id", tournamentId);
  if (error) return { error: "Impossible d'enregistrer le format." };

  await tracer(ctx.supabase, tournamentId, "modification_format_defaut", {
    avant: ctx.formatDefautActuel,
    apres: valide.format,
  });
  rafraichir(tournamentId);
  return { success: true };
}

export async function enregistrerFormatsParPhase(tournamentId: string, brut: unknown): Promise<Resultat> {
  if (!(await estAdmin())) return { error: "Non autorisé." };
  if (!idSchema.safeParse(tournamentId).success) return { error: "Requête invalide." };

  const valide = validerFormatsParPhase(brut);
  if (!valide.ok) return { error: valide.erreurs.join(" ") };

  const ctx = await charger(tournamentId);
  if (!ctx) return { error: "Tournoi introuvable." };

  const modifiees: PhaseFormat[] = [];
  for (const phase of PHASES_FORMAT) {
    if (!memeFormat(valide.formats[phase], ctx.formatsActuels[phase])) modifiees.push(phase);
  }
  if (modifiees.length === 0) return { success: true, inchange: true };

  for (const phase of modifiees) {
    if (ctx.verrous.phases[phase].verrouille) {
      return { error: `${LIBELLES_PHASES[phase]} : ${ctx.verrous.phases[phase].raison}` };
    }
  }

  const { error } = await ctx.supabase
    .from("tournaments")
    .update({ format_par_phase: valide.formats as unknown as Json })
    .eq("id", tournamentId);
  if (error) return { error: "Impossible d'enregistrer les formats." };

  await appliquerFormatsParPhase(ctx.supabase, tournamentId);
  await tracer(ctx.supabase, tournamentId, "modification_format_phase", {
    phases: modifiees,
    avant: ctx.formatsActuels,
    apres: valide.formats,
  });
  rafraichir(tournamentId);
  return { success: true };
}

export async function enregistrerDepartage(tournamentId: string, brut: unknown): Promise<Resultat> {
  if (!(await estAdmin())) return { error: "Non autorisé." };
  if (!idSchema.safeParse(tournamentId).success) return { error: "Requête invalide." };

  const valide = validerDepartage(brut);
  if (!valide.ok) return { error: valide.erreurs.join(" ") };

  const ctx = await charger(tournamentId);
  if (!ctx) return { error: "Tournoi introuvable." };

  const actuel = ctx.tournoi.tiebreak_rules as unknown as string[];
  if (JSON.stringify(actuel) === JSON.stringify(valide.criteres)) return { success: true, inchange: true };
  if (ctx.verrous.departage.verrouille) return { error: ctx.verrous.departage.raison! };

  const { error } = await ctx.supabase
    .from("tournaments")
    .update({ tiebreak_rules: valide.criteres as unknown as Json })
    .eq("id", tournamentId);
  if (error) return { error: "Impossible d'enregistrer l'ordre de départage." };

  await tracer(ctx.supabase, tournamentId, "modification_departage", { avant: actuel, apres: valide.criteres });
  rafraichir(tournamentId);
  return { success: true };
}
