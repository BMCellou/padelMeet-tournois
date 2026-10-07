"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { determinerVainqueurMatch, expliquerScoreIndetermine, type SetSaisi } from "@/lib/engine/score";
import type { CritereDepartage } from "@/lib/engine/classement";
import { recalculerClassementPoule } from "@/lib/tournoi/classementPoule";
import type { MatchFormat } from "@/lib/engine/types";
import type { Json } from "@/lib/supabase/database.types";
import { regenererTableauAuto, tenterGenerationAutomatique } from "@/lib/tournoi/tableauFinal";
import { evaluerCorrectionPoule, type ResultatEvaluation } from "@/lib/tournoi/correctionPoule";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type ActionResult = { error: string } | { success: true; info?: string };

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
    .select(
      "id, tournament_id, group_id, team_a_id, team_b_id, statut, format_override, phase, next_match_id, next_slot, loser_next_match_id, loser_next_slot",
    )
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

/**
 * Après validation/correction/forfait : recalcule le classement de poule
 * (phase='poule'), ou propage le vainqueur vers le match suivant du
 * tableau (phase='tableau', §4.8) — et, pour une demi-finale, le
 * perdant vers la petite finale (loser_next_match_id). Rien à propager
 * de plus loin pour la finale ou la petite finale elle-même
 * (phase='classement').
 */
async function apresValidation(
  supabase: SupabaseServerClient,
  tournamentId: string,
  match: {
    phase: string;
    group_id: string | null;
    team_a_id: string | null;
    team_b_id: string | null;
    next_match_id: string | null;
    next_slot: string | null;
    loser_next_match_id: string | null;
    loser_next_slot: string | null;
  },
  winnerId: string,
  tiebreakRules: CritereDepartage[],
): Promise<void> {
  if (match.phase === "poule") {
    await recalculerClassementPoule(supabase, tournamentId, match.group_id!, tiebreakRules);
    return;
  }

  if (match.phase !== "tableau") return;

  if (match.next_match_id) {
    const champ = match.next_slot === "a" ? { team_a_id: winnerId } : { team_b_id: winnerId };
    await supabase.from("matches").update(champ).eq("id", match.next_match_id);
  }

  if (match.loser_next_match_id) {
    const loserId = winnerId === match.team_a_id ? match.team_b_id! : match.team_a_id!;
    const champ = match.loser_next_slot === "a" ? { team_a_id: loserId } : { team_b_id: loserId };
    await supabase.from("matches").update(champ).eq("id", match.loser_next_match_id);
  }
}

/**
 * Suite d'une correction de poule jugée « appliquer et régénérer » : le
 * classement vient d'être recalculé, on refait le tableau (aucun de ses
 * matchs n'a été joué, vérifié avant) et on laisse une trace.
 */
async function regenererApresCorrection(
  supabase: SupabaseServerClient,
  tournamentId: string,
  matchId: string,
  garde: ResultatEvaluation | null,
  origine: "correction" | "forfait",
): Promise<ActionResult> {
  if (!garde || garde.decision !== "appliquer_et_regenerer" || !garde.impact) return { success: true };

  const resultat = await regenererTableauAuto(supabase, tournamentId);
  if ("error" in resultat) {
    return {
      error: `Correction appliquée, mais le tableau n'a pas pu être régénéré (${resultat.error}). Régénère-le depuis « Modifier les qualifiés ».`,
    };
  }

  await supabase.from("audit_log").insert({
    tournament_id: tournamentId,
    acteur: await enregistrerActeur(supabase),
    action: "regeneration_tableau_correction",
    payload: {
      matchId,
      origine,
      entrants: garde.impact.entrants,
      sortants: garde.impact.sortants,
    } as unknown as Json,
  });
  return { success: true, info: "Le tableau a été régénéré suite à la correction : la liste des qualifiés a changé." };
}

/** Trace d'une correction refusée parce qu'elle changerait les qualifiés d'un tableau commencé. */
async function tracerRefus(
  supabase: SupabaseServerClient,
  tournamentId: string,
  matchId: string,
  garde: ResultatEvaluation,
): Promise<void> {
  await supabase.from("audit_log").insert({
    tournament_id: tournamentId,
    acteur: await enregistrerActeur(supabase),
    action: "correction_refusee",
    payload: { matchId, entrants: garde.impact?.entrants, sortants: garde.impact?.sortants } as unknown as Json,
  });
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
    return { error: expliquerScoreIndetermine(sets, contexte.format) ?? "Le score ne désigne pas encore de vainqueur clair." };
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

  await apresValidation(supabase, tournamentId, contexte.match, winnerId!, contexte.tiebreakRules);
  if (contexte.match.phase === "poule") {
    await tenterGenerationAutomatique(supabase, tournamentId);
  }

  revalidatePath(`/admin/tournois/${tournamentId}/scores`);
  revalidatePath(`/admin/tournois/${tournamentId}/tableau`);
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
    return {
      error:
        expliquerScoreIndetermine(parsed.data, contexte.format) ?? "Le score corrigé ne désigne pas de vainqueur clair.",
    };
  }

  const winnerId =
    resultat.vainqueur === "a" ? contexte.match.team_a_id : contexte.match.team_b_id;

  // Une correction de poule peut changer les qualifiés alors que le tableau
  // existe déjà : on mesure l'impact avant d'écrire quoi que ce soit.
  const garde =
    contexte.match.phase === "poule"
      ? await evaluerCorrectionPoule(
          supabase,
          tournamentId,
          { matchId, groupId: contexte.match.group_id!, vainqueurId: winnerId!, forfait: false, sets: parsed.data },
          contexte.tiebreakRules,
        )
      : null;
  if (garde?.decision === "refuser") {
    await tracerRefus(supabase, tournamentId, matchId, garde);
    return { error: garde.message! };
  }

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
    payload: {
      matchId,
      ancienSets,
      nouveauxSets: parsed.data,
      qualifies: garde?.impact
        ? { modifie: garde.impact.modifie, entrants: garde.impact.entrants, sortants: garde.impact.sortants }
        : null,
    } as unknown as Json,
  });

  await apresValidation(supabase, tournamentId, contexte.match, winnerId!, contexte.tiebreakRules);
  const suite = await regenererApresCorrection(supabase, tournamentId, matchId, garde, "correction");

  revalidatePath(`/admin/tournois/${tournamentId}/scores`);
  revalidatePath(`/admin/tournois/${tournamentId}/tableau`);
  return suite;
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

  const garde =
    contexte.match.phase === "poule"
      ? await evaluerCorrectionPoule(
          supabase,
          tournamentId,
          { matchId, groupId: contexte.match.group_id!, vainqueurId: equipeGagnanteId, forfait: true, sets: [] },
          contexte.tiebreakRules,
        )
      : null;
  if (garde?.decision === "refuser") {
    await tracerRefus(supabase, tournamentId, matchId, garde);
    return { error: garde.message! };
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

  await apresValidation(supabase, tournamentId, contexte.match, equipeGagnanteId, contexte.tiebreakRules);
  if (contexte.match.phase === "poule") {
    await tenterGenerationAutomatique(supabase, tournamentId);
  }
  const suite = await regenererApresCorrection(supabase, tournamentId, matchId, garde, "forfait");

  revalidatePath(`/admin/tournois/${tournamentId}/scores`);
  revalidatePath(`/admin/tournois/${tournamentId}/tableau`);
  return suite;
}

/**
 * Remet un match saisi/validé/forfait à l'état "à venir" : supprime le
 * score, retire le vainqueur, et — pour un match de tableau — efface la
 * propagation vers le match suivant (à condition que celui-ci n'ait pas
 * déjà été joué, sinon on bloque pour éviter un tableau incohérent).
 */
export async function reinitialiserScore(tournamentId: string, matchId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const contexte = await chargerMatchEtFormat(supabase, matchId, tournamentId);
  if (!contexte) return { error: "Match introuvable." };

  const { match } = contexte;

  if (match.statut === "a_venir" || match.statut === "pret") {
    return { error: "Ce match n'a pas encore de score à réinitialiser." };
  }

  if (match.phase === "poule") {
    // Le tableau final a pu être généré automatiquement dès la fin des
    // poules (voir tenterGenerationAutomatique) : rouvrir un score de
    // poule après coup rendrait les qualifiés obsolètes. On l'autorise
    // tant que rien n'a encore été joué dans le tableau (l'admin peut
    // alors le régénérer depuis l'écran Qualifiés) ; on bloque dès qu'un
    // match du tableau a progressé.
    const { data: matchsTableau } = await supabase
      .from("matches")
      .select("statut")
      .eq("tournament_id", tournamentId)
      .in("phase", ["tableau", "classement", "classement_5e"]);

    if (matchsTableau?.some((m) => m.statut !== "a_venir")) {
      return {
        error:
          "Le tableau final a déjà commencé : impossible de réinitialiser ce score de poule.",
      };
    }
  }

  if (match.phase === "tableau") {
    const idsSuivants = [match.next_match_id, match.loser_next_match_id].filter(
      (id): id is string => !!id,
    );
    if (idsSuivants.length > 0) {
      const { data: matchsSuivants } = await supabase
        .from("matches")
        .select("statut")
        .in("id", idsSuivants);

      if (matchsSuivants?.some((m) => m.statut !== "a_venir")) {
        return {
          error: "Le tour suivant a déjà commencé : impossible de réinitialiser ce match.",
        };
      }
    }
  }

  await supabase.from("match_sets").delete().eq("match_id", matchId);
  await supabase.from("matches").update({ statut: "a_venir", winner_id: null }).eq("id", matchId);

  if (match.phase === "tableau" && match.next_match_id) {
    const champ = match.next_slot === "a" ? { team_a_id: null } : { team_b_id: null };
    await supabase.from("matches").update(champ).eq("id", match.next_match_id);
  }

  if (match.phase === "tableau" && match.loser_next_match_id) {
    const champ = match.loser_next_slot === "a" ? { team_a_id: null } : { team_b_id: null };
    await supabase.from("matches").update(champ).eq("id", match.loser_next_match_id);
  }

  await supabase.from("audit_log").insert({
    tournament_id: tournamentId,
    acteur: await enregistrerActeur(supabase),
    action: "reinitialisation_score",
    payload: { matchId, statutPrecedent: match.statut } as unknown as Json,
  });

  if (match.phase === "poule") {
    await recalculerClassementPoule(supabase, tournamentId, match.group_id!, contexte.tiebreakRules);
  }

  revalidatePath(`/admin/tournois/${tournamentId}/scores`);
  revalidatePath(`/admin/tournois/${tournamentId}/tableau`);
  return { success: true };
}
