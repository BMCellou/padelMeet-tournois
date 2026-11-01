"use server";

import { createClient } from "@/lib/supabase/server";
import { FORMAT_PAR_DEFAUT, type MatchFormat } from "@/lib/engine/types";
import { CODE_FORMAT_PAR_DEFAUT, estCodeFormat, getFormat } from "@/lib/engine/formats";
import { normaliserFormat, validerFormat } from "@/lib/engine/formatMatch";
import type { Json } from "@/lib/supabase/database.types";
import { verifierChangementFormat } from "@/lib/tournoi/changementFormat";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { z } from "zod";

// Champ vide = pas de limite.
const maxParticipantsSchema = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : v),
  z.coerce.number().int().min(2, "La limite doit être d'au moins 2 joueurs.").nullable(),
);

const tournamentSchema = z.object({
  // Optionnel : un tournoi peut être créé avant de savoir quel club
  // l'accueillera, pour ouvrir les inscriptions sans attendre.
  clubId: z.string().uuid().optional(),
  nom: z.string().trim().min(1, "Le nom du tournoi est requis."),
  date: z.string().min(1, "La date est requise."),
  genre: z.enum(["masculin", "feminin", "mixte"]).optional(),
  niveau: z.string().trim().optional(),
  formatAnimation: z.string().refine(estCodeFormat, "Format d'animation inconnu.").default(CODE_FORMAT_PAR_DEFAUT),
  // Absent pour un format sans tableau final.
  nbQualifies: z.coerce.number().int().positive().optional(),
  dureeMatchMin: z.coerce.number().int().positive(),
  pauseMin: z.coerce.number().int().nonnegative(),
  maxParticipants: maxParticipantsSchema,
  // Formats à rotation de partenaires.
  nbTours: z.coerce.number().int().min(1, "Il faut au moins une manche.").optional(),
  nbTerrains: z.coerce.number().int().min(1, "Au moins un terrain est nécessaire.").optional(),
  pointsCible: z.coerce.number().int().min(2, "Une manche vaut au moins 2 points.").max(100, "Une manche vaut au plus 100 points.").optional(),
});

type CreerTournoiResult = { error: string } | { success: true; tournamentId: string };

function genererSlugPublic(): string {
  return randomUUID().replace(/-/g, "").slice(0, 12);
}

export async function creerTournoi(
  _prevState: CreerTournoiResult | null,
  formData: FormData,
): Promise<CreerTournoiResult> {
  const clubIdBrut = formData.get("clubId");
  const parsed = tournamentSchema.safeParse({
    clubId: clubIdBrut === "aucun" ? undefined : clubIdBrut || undefined,
    nom: formData.get("nom"),
    date: formData.get("date"),
    genre: formData.get("genre") || undefined,
    niveau: formData.get("niveau") || undefined,
    formatAnimation: formData.get("formatAnimation") || undefined,
    nbQualifies: formData.get("nbQualifies") || undefined,
    dureeMatchMin: formData.get("dureeMatchMin"),
    pauseMin: formData.get("pauseMin"),
    maxParticipants: formData.get("maxParticipants"),
    nbTours: formData.get("nbTours") || undefined,
    nbTerrains: formData.get("nbTerrains") || undefined,
    pointsCible: formData.get("pointsCible") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  // Le formulaire s'adapte au format déclaré : on ne lit que les réglages qu'il demande.
  const format = getFormat(parsed.data.formatAnimation);
  let formatConfig: MatchFormat = FORMAT_PAR_DEFAUT;
  let configAnimation: Json = {};
  let nbQualifies: number | null = parsed.data.nbQualifies ?? null;

  if (format.aUnTableauFinal) {
    if (nbQualifies === null) return { error: "Le nombre de qualifiés est requis." };
  } else {
    nbQualifies = null;
  }

  if (format.rotation) {
    const { nbTours, nbTerrains, pointsCible, maxParticipants, dureeMatchMin } = parsed.data;
    if (maxParticipants === null || maxParticipants === undefined) return { error: "Le nombre de joueurs est requis." };
    if (!nbTours || !nbTerrains || !pointsCible) return { error: "Manches, terrains et points par manche sont requis." };
    const verdict = format.validerEffectif(maxParticipants, nbTerrains);
    if (!verdict.ok) return { error: verdict.message ?? "Effectif insuffisant." };
    formatConfig = normaliserFormat({
      ...FORMAT_PAR_DEFAUT,
      modeScore: "points",
      pointsCible,
      sommeExacte: true,
      limiteTempsMin: null,
      regleFinDeTemps: "aucune",
      dureeEstimeeMin: dureeMatchMin,
    });
    const validation = validerFormat(formatConfig);
    if (!validation.ok) return { error: validation.erreurs[0] };
    configAnimation = { nbTours, nbTerrains };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tournaments")
    .insert({
      club_id: parsed.data.clubId ?? null,
      nom: parsed.data.nom,
      date: parsed.data.date,
      genre: parsed.data.genre,
      niveau: parsed.data.niveau,
      nb_qualifies: nbQualifies,
      duree_match_min: parsed.data.dureeMatchMin,
      pause_min: parsed.data.pauseMin,
      max_participants: parsed.data.maxParticipants,
      public_slug: genererSlugPublic(),
      format_animation: format.code,
      config_animation: configAnimation,
      format_config: formatConfig as unknown as Json,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Impossible de créer le tournoi." };
  }

  redirect(`/admin/tournois/${data.id}`);
}

const modifierTournoiSchema = z.object({
  tournamentId: z.string().uuid(),
  clubId: z.string().uuid().optional(),
  nom: z.string().trim().min(1, "Le nom du tournoi est requis."),
  date: z.string().min(1, "La date est requise."),
  genre: z.enum(["masculin", "feminin", "mixte"]).optional(),
  niveau: z.string().trim().optional(),
  statut: z.enum(["brouillon", "publie", "en_cours", "termine"]),
  // Absent pour un format sans tableau final : la valeur en base est alors laissée telle quelle.
  nbQualifies: z.coerce.number().int().positive().optional(),
  dureeMatchMin: z.coerce.number().int().positive(),
  pauseMin: z.coerce.number().int().nonnegative(),
  maxParticipants: maxParticipantsSchema,
  // Absent = format inchangé.
  formatAnimation: z.string().refine(estCodeFormat, "Format d'animation inconnu.").optional(),
  reinitialiserTirage: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
});

type ActionResult = { error: string } | { success: true };

export async function modifierTournoi(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const clubIdBrut = formData.get("clubId");
  const parsed = modifierTournoiSchema.safeParse({
    tournamentId: formData.get("tournamentId"),
    clubId: clubIdBrut === "aucun" ? undefined : clubIdBrut || undefined,
    nom: formData.get("nom"),
    date: formData.get("date"),
    genre: formData.get("genre") || undefined,
    niveau: formData.get("niveau") || undefined,
    statut: formData.get("statut"),
    nbQualifies: formData.get("nbQualifies") || undefined,
    dureeMatchMin: formData.get("dureeMatchMin"),
    pauseMin: formData.get("pauseMin"),
    maxParticipants: formData.get("maxParticipants"),
    formatAnimation: formData.get("formatAnimation") || undefined,
    reinitialiserTirage: formData.get("reinitialiserTirage"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { tournamentId, ...d } = parsed.data;

  // Changement de format : seulement tant que le tournoi n'a pas commencé (relu en base, jamais déduit du formulaire).
  let changementFormat: { code: string; nbQualifies: number | null } | null = null;
  if (d.formatAnimation !== undefined) {
    const [{ data: actuel }, { data: matchs }, { count: nbGroupes }] = await Promise.all([
      supabase.from("tournaments").select("format_animation, statut, nb_qualifies").eq("id", tournamentId).single(),
      supabase.from("matches").select("statut").eq("tournament_id", tournamentId),
      supabase.from("groups").select("id", { count: "exact", head: true }).eq("tournament_id", tournamentId),
    ]);
    if (!actuel || !matchs) return { error: "Impossible de lire le tournoi." };

    if (d.formatAnimation !== actuel.format_animation) {
      const etat = { statut: actuel.statut, statutsMatchs: matchs.map((m) => m.statut), nbGroupes: nbGroupes ?? 0 };
      const verdict = verifierChangementFormat({
        codeActuel: actuel.format_animation,
        codeCible: d.formatAnimation,
        statutDemande: d.statut,
        etat,
        tirageSupprimeConfirme: d.reinitialiserTirage,
        nbQualifiesSaisi: d.nbQualifies ?? null,
        nbQualifiesEnregistre: actuel.nb_qualifies,
      });
      if (!verdict.ok) return { error: verdict.error };

      if (verdict.supprimerTirage) {
        // Même ordre que le tirage : les matchs d'abord (ils référencent les poules), puis les poules.
        const { error: erreurMatchs } = await supabase.from("matches").delete().eq("tournament_id", tournamentId);
        const { error: erreurGroupes } = await supabase.from("groups").delete().eq("tournament_id", tournamentId);
        if (erreurMatchs || erreurGroupes) return { error: "Impossible de supprimer le tirage existant." };
        await supabase.from("tournaments").update({ tirage_seed: null }).eq("id", tournamentId);
      }
      changementFormat = { code: d.formatAnimation, nbQualifies: verdict.nbQualifies };

      const { data: auth } = await supabase.auth.getUser();
      await supabase.from("audit_log").insert({
        tournament_id: tournamentId,
        acteur: auth.user?.email ?? "admin",
        action: "changement_format",
        payload: {
          de: actuel.format_animation,
          vers: d.formatAnimation,
          tirageSupprime: verdict.supprimerTirage,
        } as Json,
      });
    }
  }

  const { error } = await supabase
    .from("tournaments")
    .update({
      club_id: d.clubId ?? null,
      nom: d.nom,
      date: d.date,
      genre: d.genre,
      niveau: d.niveau,
      statut: d.statut,
      ...(changementFormat
        ? { format_animation: changementFormat.code, nb_qualifies: changementFormat.nbQualifies }
        : d.nbQualifies !== undefined
          ? { nb_qualifies: d.nbQualifies }
          : {}),
      duree_match_min: d.dureeMatchMin,
      pause_min: d.pauseMin,
      max_participants: d.maxParticipants,
    })
    .eq("id", tournamentId);

  if (error) {
    return { error: "Impossible de modifier le tournoi." };
  }

  // La barre latérale et les écrans dépendent du format : on rafraîchit tout le tournoi.
  revalidatePath(`/admin/tournois/${tournamentId}`, "layout");
  return { success: true };
}

export async function supprimerTournoi(tournamentId: string): Promise<void> {
  const supabase = await createClient();
  // Cascade en base sur teams, groups, matches, registrations,
  // tournament_courts : supprimer le tournoi suffit.
  await supabase.from("tournaments").delete().eq("id", tournamentId);
  redirect("/admin");
}
