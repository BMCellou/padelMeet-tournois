"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { determinerVainqueurMatch, type SetSaisi } from "@/lib/engine/score";
import { calculerClassement, type MatchTermine, type CritereDepartage } from "@/lib/engine/classement";
import type { MatchFormat } from "@/lib/engine/types";
import type { Json } from "@/lib/supabase/database.types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type ActionResult = { error: string } | { success: true };

const setSchema = z.object({
  jeuxA: z.number().int().min(0),
  jeuxB: z.number().int().min(0),
  tiebreakA: z.number().int().min(0).nullable().optional(),
  tiebreakB: z.number().int().min(0).nullable().optional(),
});

const setsSchema = z.array(setSchema).min(1, "Au moins un set est requis.");

async function chargerMatchEtFormat(supabase: SupabaseServerClient, matchId: string, tournamentId: string) {
  const { data: match } = await supabase
    .from("matches")
    .select("id, tournament_id, group_id, team_a_id, team_b_id, statut, format_override")
    .eq("id", matchId)
    .eq("tournament_id", tournamentId)
    .single();

  if (!match) return null;

  const { data: tournoi } = await supabase
    .from("tournaments")
    .select("format_config, tiebreak_rules")
    .eq("id", tournamentId)
    .single();

  if (!tournoi) return null;

  const format = (match.format_override ?? tournoi.format_config) as unknown as MatchFormat;
  const tiebreakRules = tournoi.tiebreak_rules as unknown as CritereDepartage[];

  return { match, format, tiebreakRules };
}

async function enregistrerActeur(supabase: SupabaseServerClient): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email ?? "admin";
}

async function recalculerClassementPoule(
  supabase: SupabaseServerClient,
  tournamentId: string,
  groupId: string,
  tiebreakRules: CritereDepartage[],
): Promise<void> {
  const { data: groupTeams } = await supabase
    .from("group_teams")
    .select("team_id")
    .eq("group_id", groupId);
  const equipeIds = (groupTeams ?? []).map((g) => g.team_id);

  const { data: matchesTermines } = await supabase
    .from("matches")
    .select("team_a_id, team_b_id, winner_id, statut, match_sets(jeux_a, jeux_b, tiebreak_a, tiebreak_b)")
    .eq("group_id", groupId)
    .in("statut", ["valide", "forfait"]);

  const donnees: MatchTermine[] = (matchesTermines ?? []).map((m) => {
    if (m.statut === "forfait") {
      return {
        teamAId: m.team_a_id!,
        teamBId: m.team_b_id!,
        vainqueurId: m.winner_id!,
        setsA: 0,
        setsB: 0,
        jeuxA: 0,
        jeuxB: 0,
      };
    }

    let setsA = 0;
    let setsB = 0;
    let jeuxA = 0;
    let jeuxB = 0;

    for (const s of m.match_sets) {
      jeuxA += s.jeux_a;
      jeuxB += s.jeux_b;
      if (s.jeux_a > s.jeux_b) setsA++;
      else if (s.jeux_b > s.jeux_a) setsB++;
      else if (s.tiebreak_a != null && s.tiebreak_b != null) {
        if (s.tiebreak_a > s.tiebreak_b) setsA++;
        else if (s.tiebreak_b > s.tiebreak_a) setsB++;
      }
    }

    return { teamAId: m.team_a_id!, teamBId: m.team_b_id!, vainqueurId: m.winner_id!, setsA, setsB, jeuxA, jeuxB };
  });

  const classement = calculerClassement(donnees, equipeIds, tiebreakRules);

  await supabase.from("standings").delete().eq("group_id", groupId);
  if (classement.length > 0) {
    await supabase.from("standings").insert(
      classement.map((e) => ({
        tournament_id: tournamentId,
        group_id: groupId,
        team_id: e.teamId,
        joues: e.joues,
        v: e.v,
        d: e.d,
        sets_g: e.setsG,
        sets_p: e.setsP,
        jeux_g: e.jeuxG,
        jeux_p: e.jeuxP,
        ratio_sets: e.ratioSets,
        ratio_jeux: e.ratioJeux,
        rang: e.rang,
      })),
    );
  }
}

async function remplacerSets(supabase: SupabaseServerClient, matchId: string, sets: SetSaisi[]): Promise<void> {
  await supabase.from("match_sets").delete().eq("match_id", matchId);
  await supabase.from("match_sets").insert(
    sets.map((s, i) => ({
      match_id: matchId,
      numero: i + 1,
      jeux_a: s.jeuxA,
      jeux_b: s.jeuxB,
      tiebreak_a: s.tiebreakA ?? null,
      tiebreak_b: s.tiebreakB ?? null,
    })),
  );
}

export async function enregistrerScore(
  tournamentId: string,
  matchId: string,
  sets: SetSaisi[],
): Promise<ActionResult> {
  const parsed = setsSchema.safeParse(sets);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const contexte = await chargerMatchEtFormat(supabase, matchId, tournamentId);
  if (!contexte) return { error: "Match introuvable." };

  const resultat = determinerVainqueurMatch(parsed.data, contexte.format);
  const winnerId =
    resultat.vainqueur === "a"
      ? contexte.match.team_a_id
      : resultat.vainqueur === "b"
        ? contexte.match.team_b_id
        : null;

  await remplacerSets(supabase, matchId, parsed.data);
  await supabase
    .from("matches")
    .update({ statut: "saisi", winner_id: winnerId })
    .eq("id", matchId);

  revalidatePath(`/admin/tournois/${tournamentId}/scores`);
  return { success: true };
}

export async function validerScore(tournamentId: string, matchId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const contexte = await chargerMatchEtFormat(supabase, matchId, tournamentId);
  if (!contexte) return { error: "Match introuvable." };

  const { data: setsExistants } = await supabase
    .from("match_sets")
    .select("jeux_a, jeux_b, tiebreak_a, tiebreak_b")
    .eq("match_id", matchId)
    .order("numero");

  const sets: SetSaisi[] = (setsExistants ?? []).map((s) => ({
    jeuxA: s.jeux_a,
    jeuxB: s.jeux_b,
    tiebreakA: s.tiebreak_a,
    tiebreakB: s.tiebreak_b,
  }));

  const resultat = determinerVainqueurMatch(sets, contexte.format);
  if (!resultat.vainqueur) {
    return { error: "Le score ne désigne pas encore de vainqueur clair." };
  }

  const winnerId =
    resultat.vainqueur === "a" ? contexte.match.team_a_id : contexte.match.team_b_id;

  await supabase.from("matches").update({ statut: "valide", winner_id: winnerId }).eq("id", matchId);

  await supabase.from("audit_log").insert({
    tournament_id: tournamentId,
    acteur: await enregistrerActeur(supabase),
    action: "validation_score",
    payload: { matchId, sets } as unknown as Json,
  });

  await recalculerClassementPoule(supabase, tournamentId, contexte.match.group_id!, contexte.tiebreakRules);

  revalidatePath(`/admin/tournois/${tournamentId}/scores`);
  return { success: true };
}

export async function corrigerScore(
  tournamentId: string,
  matchId: string,
  sets: SetSaisi[],
): Promise<ActionResult> {
  const parsed = setsSchema.safeParse(sets);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const contexte = await chargerMatchEtFormat(supabase, matchId, tournamentId);
  if (!contexte) return { error: "Match introuvable." };

  if (contexte.match.statut !== "valide" && contexte.match.statut !== "forfait") {
    return { error: "Seul un match déjà validé peut être corrigé." };
  }

  const resultat = determinerVainqueurMatch(parsed.data, contexte.format);
  if (!resultat.vainqueur) {
    return { error: "Le score corrigé ne désigne pas de vainqueur clair." };
  }

  const winnerId =
    resultat.vainqueur === "a" ? contexte.match.team_a_id : contexte.match.team_b_id;

  const { data: ancienSets } = await supabase
    .from("match_sets")
    .select("numero, jeux_a, jeux_b, tiebreak_a, tiebreak_b")
    .eq("match_id", matchId);

  await remplacerSets(supabase, matchId, parsed.data);
  await supabase
    .from("matches")
    .update({ statut: "valide", winner_id: winnerId })
    .eq("id", matchId);

  await supabase.from("audit_log").insert({
    tournament_id: tournamentId,
    acteur: await enregistrerActeur(supabase),
    action: "correction_score",
    payload: { matchId, ancienSets, nouveauxSets: parsed.data } as unknown as Json,
  });

  await recalculerClassementPoule(supabase, tournamentId, contexte.match.group_id!, contexte.tiebreakRules);

  revalidatePath(`/admin/tournois/${tournamentId}/scores`);
  return { success: true };
}

export async function declarerForfait(
  tournamentId: string,
  matchId: string,
  equipeGagnanteId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const contexte = await chargerMatchEtFormat(supabase, matchId, tournamentId);
  if (!contexte) return { error: "Match introuvable." };

  if (equipeGagnanteId !== contexte.match.team_a_id && equipeGagnanteId !== contexte.match.team_b_id) {
    return { error: "Équipe invalide pour ce match." };
  }

  await supabase.from("match_sets").delete().eq("match_id", matchId);
  await supabase
    .from("matches")
    .update({ statut: "forfait", winner_id: equipeGagnanteId })
    .eq("id", matchId);

  await supabase.from("audit_log").insert({
    tournament_id: tournamentId,
    acteur: await enregistrerActeur(supabase),
    action: "forfait",
    payload: { matchId, equipeGagnanteId } as unknown as Json,
  });

  await recalculerClassementPoule(supabase, tournamentId, contexte.match.group_id!, contexte.tiebreakRules);

  revalidatePath(`/admin/tournois/${tournamentId}/scores`);
  return { success: true };
}
