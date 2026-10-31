"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import type { Json } from "@/lib/supabase/database.types";
import type { ConfigAnimation } from "@/lib/engine/formats";
import { chargerFormat } from "@/lib/tournoi/formatAnimation";
import { heureLocaleVersISO } from "@/lib/temps";
import { creerManches, supprimerToutesLesManches } from "@/lib/tournoi/manches";
import { recalculerClassementJoueurs } from "@/lib/tournoi/classementJoueurs";
import type { SetSaisi } from "@/lib/engine/score";
import { corrigerScore, enregistrerScore, validerScore } from "../scores/actions";

type ActionResult = { error: string } | { success: true; info?: string };

const genererSchema = z.object({
  tournamentId: z.string().uuid(),
  heureDebut: z.string().regex(/^\d{2}:\d{2}$/, "Heure invalide."),
});

/**
 * Génère toutes les manches de l'Americano (calendrier statique) : la rotation est calculée une
 * fois, avec une graine mémorisée dans config_animation pour pouvoir la rejouer à l'identique,
 * puis chaque manche est créée (deux équipes éphémères + un match). Le classement individuel
 * est initialisé à zéro pour que la page publique le lise dès le premier tour.
 */
export async function genererManches(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = genererSchema.safeParse({
    tournamentId: formData.get("tournamentId"),
    heureDebut: formData.get("heureDebut"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { tournamentId, heureDebut } = parsed.data;

  const supabase = await createClient();
  const format = await chargerFormat(supabase, tournamentId);
  if (!format.rotation) return { error: "Ce format d'animation n'a pas de rotation de partenaires." };

  const { data: tournoi } = await supabase
    .from("tournaments")
    .select("id, date, duree_match_min, pause_min, config_animation")
    .eq("id", tournamentId)
    .single();
  if (!tournoi) return { error: "Tournoi introuvable." };

  const { count: existantes } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournamentId)
    .eq("phase", "manche");
  if ((existantes ?? 0) > 0) return { error: "Les manches sont déjà générées." };

  const { data: terrainsLies } = await supabase
    .from("tournament_courts")
    .select("courts(id, ordre)")
    .eq("tournament_id", tournamentId);
  const terrains = (terrainsLies ?? [])
    .map((t) => t.courts)
    .filter((c): c is { id: string; ordre: number } => !!c)
    .sort((a, b) => a.ordre - b.ordre);

  const { data: inscrits } = await supabase
    .from("registrations")
    .select("player_id, players(id, nom, prenom)")
    .eq("tournament_id", tournamentId)
    .eq("type", "solo")
    .neq("statut", "annule");
  const joueurs = (inscrits ?? []).map((r) => r.players).filter((p): p is { id: string; nom: string; prenom: string } => !!p);

  const verdict = format.validerEffectif(joueurs.length, terrains.length);
  if (!verdict.ok) {
    return { error: verdict.message ?? "Effectif ou terrains insuffisants." };
  }

  const config = (tournoi.config_animation ?? {}) as ConfigAnimation & { graine?: number };
  const graine = config.graine ?? Math.floor(Math.random() * 2_147_483_647);
  const nbTours = config.nbTours ?? format.rotation.nbToursParDefaut(joueurs.length);

  const tours = format.genererTours({
    participants: joueurs.map((p) => ({ id: p.id })),
    terrains,
    config: { ...config, nbTours },
    graine,
    planification: {
      heureDebut: heureLocaleVersISO(tournoi.date, heureDebut),
      dureeJeuMin: tournoi.duree_match_min ?? 20,
      rotationMin: tournoi.pause_min ?? 5,
      reposMinMin: 0,
    },
    matchs: [],
  });

  const nomJoueur = new Map(joueurs.map((p) => [p.id, `${p.prenom} ${p.nom}`]));
  const creation = await creerManches(supabase, tournamentId, tours, nomJoueur);
  if ("error" in creation) {
    await supprimerToutesLesManches(supabase, tournamentId);
    return { error: creation.error };
  }

  await supabase
    .from("tournaments")
    .update({
      config_animation: { ...config, graine, nbTours } as unknown as Json,
      heure_debut: heureDebut,
      statut: "en_cours",
    })
    .eq("id", tournamentId);
  await recalculerClassementJoueurs(createServiceClient(), tournamentId);

  revalidatePath(`/admin/tournois/${tournamentId}/deroule`);
  return { success: true, info: verdict.avertissement };
}

/** Efface les manches tant qu'aucune n'a commencé : permet de changer les inscrits ou la graine. */
export async function reinitialiserManches(tournamentId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: matchs } = await supabase
    .from("matches")
    .select("statut")
    .eq("tournament_id", tournamentId)
    .eq("phase", "manche");
  if (matchs?.some((m) => m.statut !== "a_venir")) {
    return { error: "Des scores ont déjà été saisis : impossible de régénérer les manches." };
  }
  await supprimerToutesLesManches(supabase, tournamentId);
  await supabase
    .from("tournaments")
    .update({ statut: "publie" })
    .eq("id", tournamentId)
    .eq("statut", "en_cours");
  await recalculerClassementJoueurs(createServiceClient(), tournamentId);
  revalidatePath(`/admin/tournois/${tournamentId}/deroule`);
  return { success: true };
}

/**
 * Saisie + validation d'une manche en UN seul appel : les actions de score existantes
 * (enregistrerScore puis validerScore) sont réutilisées telles quelles — audit, contrôle du
 * total, arbitrage du vainqueur et mise à jour du classement individuel passent par elles.
 */
export async function validerManche(tournamentId: string, matchId: string, sets: SetSaisi[]): Promise<ActionResult> {
  const enregistre = await enregistrerScore(tournamentId, matchId, sets);
  if ("error" in enregistre) return enregistre;
  const valide = await validerScore(tournamentId, matchId);
  if ("error" in valide) return valide;
  revalidatePath(`/admin/tournois/${tournamentId}/deroule`);
  return { success: true };
}

/** Corrige une manche déjà validée (les anciens points restent dans le journal d'audit). */
export async function corrigerManche(tournamentId: string, matchId: string, sets: SetSaisi[]): Promise<ActionResult> {
  const resultat = await corrigerScore(tournamentId, matchId, sets);
  if ("error" in resultat) return resultat;
  revalidatePath(`/admin/tournois/${tournamentId}/deroule`);
  return { success: true };
}

/** Clôture le tournoi une fois toutes les manches validées. */
export async function terminerRotation(tournamentId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: matchs } = await supabase
    .from("matches")
    .select("statut")
    .eq("tournament_id", tournamentId)
    .eq("phase", "manche");
  if (!matchs || matchs.length === 0) return { error: "Aucune manche à clôturer." };
  if (matchs.some((m) => m.statut !== "valide" && m.statut !== "forfait")) {
    return { error: "Toutes les manches ne sont pas encore validées." };
  }
  await supabase.from("tournaments").update({ statut: "termine" }).eq("id", tournamentId);
  revalidatePath(`/admin/tournois/${tournamentId}/deroule`);
  return { success: true };
}
