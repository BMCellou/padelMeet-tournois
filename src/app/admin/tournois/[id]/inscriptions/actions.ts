"use server";

import { createClient } from "@/lib/supabase/server";
import { apparierSolos, type JoueurSolo, type StrategieAppariement } from "@/lib/engine/appariement";
import { creerRng } from "@/lib/engine/rng";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const pairSchema = z.object({
  tournamentId: z.string().uuid(),
  joueurAId: z.string().uuid().optional(),
  nomA: z.string().trim().optional(),
  prenomA: z.string().trim().optional(),
  sexeA: z.enum(["H", "F"]).optional(),
  classementA: z.string().trim().optional(),
  joueurBId: z.string().uuid().optional(),
  nomB: z.string().trim().optional(),
  prenomB: z.string().trim().optional(),
  sexeB: z.enum(["H", "F"]).optional(),
  classementB: z.string().trim().optional(),
});

type ActionResult = { error: string } | { success: true };

/** Un joueur (recherché puis choisi via `ChampsJoueur`) ne doit pas être
 * réinscrit une seconde fois au même tournoi — ni en équipe, ni en solo.
 * Vérification de sécurité en plus du filtrage déjà fait par la recherche
 * (utile si deux admins agissent en même temps, ou si le résultat affiché
 * est devenu obsolète). */
async function joueurDejaInscrit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tournamentId: string,
  playerId: string,
): Promise<boolean> {
  const [{ data: enEquipe }, { data: enSolo }] = await Promise.all([
    supabase
      .from("team_players")
      .select("player_id, teams!inner(tournament_id)")
      .eq("player_id", playerId)
      .eq("teams.tournament_id", tournamentId)
      .maybeSingle(),
    supabase
      .from("registrations")
      .select("id")
      .eq("tournament_id", tournamentId)
      .eq("type", "solo")
      .eq("player_id", playerId)
      .maybeSingle(),
  ]);
  return !!enEquipe || !!enSolo;
}

export async function ajouterPaire(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = pairSchema.safeParse({
    tournamentId: formData.get("tournamentId"),
    joueurAId: formData.get("joueurAId") || undefined,
    nomA: formData.get("nomA") || undefined,
    prenomA: formData.get("prenomA") || undefined,
    sexeA: formData.get("sexeA") || undefined,
    classementA: formData.get("classementA") || undefined,
    joueurBId: formData.get("joueurBId") || undefined,
    nomB: formData.get("nomB") || undefined,
    prenomB: formData.get("prenomB") || undefined,
    sexeB: formData.get("sexeB") || undefined,
    classementB: formData.get("classementB") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { tournamentId, joueurAId, joueurBId, ...d } = parsed.data;

  if (!joueurAId && (!d.nomA || !d.prenomA)) {
    return { error: "Le prénom et le nom du premier joueur sont requis." };
  }
  if (!joueurBId && (!d.nomB || !d.prenomB)) {
    return { error: "Le prénom et le nom du second joueur sont requis." };
  }
  if (joueurAId && joueurBId && joueurAId === joueurBId) {
    return { error: "Les deux joueurs doivent être différents." };
  }

  let idA = joueurAId;
  let nomCompletA = idA ? "" : `${d.prenomA} ${d.nomA}`;
  let idB = joueurBId;
  let nomCompletB = idB ? "" : `${d.prenomB} ${d.nomB}`;

  if (idA && (await joueurDejaInscrit(supabase, tournamentId, idA))) {
    return { error: "Le premier joueur est déjà inscrit à ce tournoi." };
  }
  if (idB && (await joueurDejaInscrit(supabase, tournamentId, idB))) {
    return { error: "Le second joueur est déjà inscrit à ce tournoi." };
  }

  if (!idA) {
    const { data, error } = await supabase
      .from("players")
      .insert({ nom: d.nomA!, prenom: d.prenomA!, sexe: d.sexeA, classement_fft: d.classementA })
      .select("id")
      .single();
    if (error || !data) return { error: "Impossible de créer le premier joueur." };
    idA = data.id;
  }

  if (!idB) {
    const { data, error } = await supabase
      .from("players")
      .insert({ nom: d.nomB!, prenom: d.prenomB!, sexe: d.sexeB, classement_fft: d.classementB })
      .select("id")
      .single();
    if (error || !data) return { error: "Impossible de créer le second joueur." };
    idB = data.id;
  }

  if (!nomCompletA || !nomCompletB) {
    const { data: joueursExistants } = await supabase
      .from("players")
      .select("id, nom, prenom")
      .in("id", [idA, idB]);
    const trouve = (id: string) => joueursExistants?.find((p) => p.id === id);
    if (!nomCompletA) {
      const p = trouve(idA);
      nomCompletA = p ? `${p.prenom} ${p.nom}` : "Joueur";
    }
    if (!nomCompletB) {
      const p = trouve(idB);
      nomCompletB = p ? `${p.prenom} ${p.nom}` : "Joueur";
    }
  }

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .insert({
      tournament_id: tournamentId,
      nom_affiche: `${nomCompletA} / ${nomCompletB}`,
      origine: "paire",
    })
    .select("id")
    .single();

  if (teamError || !team) {
    return { error: "Impossible de créer l'équipe." };
  }

  const { error: tpError } = await supabase.from("team_players").insert([
    { team_id: team.id, player_id: idA },
    { team_id: team.id, player_id: idB },
  ]);

  if (tpError) {
    return { error: "Impossible d'associer les joueurs à l'équipe." };
  }

  await supabase.from("registrations").insert({
    tournament_id: tournamentId,
    type: "paire",
    team_id: team.id,
    statut: "valide",
  });

  revalidatePath(`/admin/tournois/${tournamentId}/inscriptions`);
  return { success: true };
}

const soloSchema = z.object({
  tournamentId: z.string().uuid(),
  joueurId: z.string().uuid().optional(),
  nom: z.string().trim().optional(),
  prenom: z.string().trim().optional(),
  sexe: z.enum(["H", "F"]).optional(),
  classement: z.string().trim().optional(),
});

export async function ajouterSolo(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = soloSchema.safeParse({
    tournamentId: formData.get("tournamentId"),
    joueurId: formData.get("joueurId") || undefined,
    nom: formData.get("nom") || undefined,
    prenom: formData.get("prenom") || undefined,
    sexe: formData.get("sexe") || undefined,
    classement: formData.get("classement") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { tournamentId, joueurId, ...d } = parsed.data;

  if (!joueurId && (!d.nom || !d.prenom)) {
    return { error: "Le prénom et le nom sont requis." };
  }

  let playerId = joueurId;

  if (playerId && (await joueurDejaInscrit(supabase, tournamentId, playerId))) {
    return { error: "Ce joueur est déjà inscrit à ce tournoi." };
  }

  if (!playerId) {
    const { data: joueur, error: joueurError } = await supabase
      .from("players")
      .insert({ nom: d.nom!, prenom: d.prenom!, sexe: d.sexe, classement_fft: d.classement })
      .select("id")
      .single();

    if (joueurError || !joueur) {
      return { error: "Impossible de créer le joueur." };
    }
    playerId = joueur.id;
  }

  const { error: regError } = await supabase.from("registrations").insert({
    tournament_id: tournamentId,
    type: "solo",
    player_id: playerId,
    statut: "en_attente",
  });

  if (regError) {
    return { error: "Impossible d'inscrire le joueur." };
  }

  revalidatePath(`/admin/tournois/${tournamentId}/inscriptions`);
  return { success: true };
}

const rechercherJoueursSchema = z.object({
  query: z.string().trim().min(2),
  tournamentId: z.string().uuid(),
});

export interface JoueurRecherche {
  id: string;
  nom: string;
  prenom: string;
  sexe: string | null;
  classementFft: string | null;
  telephone: string | null;
  email: string | null;
}

/** Recherche globale (tous tournois confondus) pour réinscrire un joueur
 * déjà connu — typiquement inscrit à un tournoi précédent — sans dupliquer
 * sa fiche. Exclut les joueurs déjà inscrits (équipe ou solo) à CE
 * tournoi, pour ne pas proposer un doublon dans les résultats. */
export async function rechercherJoueurs(
  query: string,
  tournamentId: string,
): Promise<JoueurRecherche[]> {
  const parsed = rechercherJoueursSchema.safeParse({ query, tournamentId });
  if (!parsed.success) return [];

  const q = parsed.data.query.replace(/[,%]/g, "");
  if (q.length < 2) return [];

  const supabase = await createClient();

  const [{ data: matches }, { data: dejaEquipes }, { data: dejaSolo }] = await Promise.all([
    supabase
      .from("players")
      .select("id, nom, prenom, sexe, classement_fft, telephone, email")
      .or(`nom.ilike.%${q}%,prenom.ilike.%${q}%,email.ilike.%${q}%`)
      .order("nom")
      .limit(20),
    supabase
      .from("team_players")
      .select("player_id, teams!inner(tournament_id)")
      .eq("teams.tournament_id", parsed.data.tournamentId),
    supabase
      .from("registrations")
      .select("player_id")
      .eq("tournament_id", parsed.data.tournamentId)
      .eq("type", "solo")
      .not("player_id", "is", null),
  ]);

  const dejaInscritIds = new Set<string>([
    ...(dejaEquipes ?? []).map((r) => r.player_id),
    ...(dejaSolo ?? []).map((r) => r.player_id!),
  ]);

  return (matches ?? [])
    .filter((p) => !dejaInscritIds.has(p.id))
    .slice(0, 8)
    .map((p) => ({
      id: p.id,
      nom: p.nom,
      prenom: p.prenom,
      sexe: p.sexe,
      classementFft: p.classement_fft,
      telephone: p.telephone,
      email: p.email,
    }));
}

const genererSchema = z.object({
  tournamentId: z.string().uuid(),
  strategie: z.enum(["aleatoire", "equilibre", "mixte"]),
});

type GenererResult =
  | { error: string }
  | { success: true; nbEquipes: number; joueursNonApparies: number };

export async function genererEquipesAleatoires(
  _prevState: GenererResult | null,
  formData: FormData,
): Promise<GenererResult> {
  const parsed = genererSchema.safeParse({
    tournamentId: formData.get("tournamentId"),
    strategie: formData.get("strategie"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const { tournamentId, strategie } = parsed.data as {
    tournamentId: string;
    strategie: StrategieAppariement;
  };

  const supabase = await createClient();

  const { data: registrations, error: regError } = await supabase
    .from("registrations")
    .select("id, player_id, players(id, nom, prenom, sexe, classement_fft)")
    .eq("tournament_id", tournamentId)
    .eq("type", "solo")
    .eq("statut", "en_attente");

  if (regError) {
    return { error: "Impossible de charger les joueurs seuls." };
  }

  if (!registrations || registrations.length === 0) {
    return { error: "Aucun joueur seul en attente." };
  }

  const joueurs: JoueurSolo[] = [];
  for (const r of registrations) {
    const p = r.players;
    if (!p) continue;

    if (strategie === "equilibre") {
      const niveau = Number(p.classement_fft);
      if (!p.classement_fft || Number.isNaN(niveau)) {
        return {
          error: `La stratégie "équilibré" demande un classement numérique pour chaque joueur seul (manquant pour ${p.prenom} ${p.nom}).`,
        };
      }
      joueurs.push({ id: p.id, niveau });
    } else if (strategie === "mixte") {
      if (p.sexe !== "H" && p.sexe !== "F") {
        return {
          error: `La stratégie "mixte" demande le sexe de chaque joueur seul (manquant pour ${p.prenom} ${p.nom}).`,
        };
      }
      joueurs.push({ id: p.id, sexe: p.sexe });
    } else {
      joueurs.push({ id: p.id });
    }
  }

  const resultat = apparierSolos(joueurs, strategie, creerRng(Date.now()));

  const { data: playersInfo } = await supabase
    .from("players")
    .select("id, nom, prenom")
    .in("id", resultat.equipes.flat());

  const nomDe = (id: string) => {
    const p = playersInfo?.find((pl) => pl.id === id);
    return p ? `${p.prenom} ${p.nom}` : id;
  };

  for (const [idA, idB] of resultat.equipes) {
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .insert({
        tournament_id: tournamentId,
        nom_affiche: `${nomDe(idA)} / ${nomDe(idB)}`,
        origine: "aleatoire",
      })
      .select("id")
      .single();

    if (teamError || !team) continue;

    await supabase.from("team_players").insert([
      { team_id: team.id, player_id: idA },
      { team_id: team.id, player_id: idB },
    ]);

    const regIds = registrations
      .filter((r) => r.player_id === idA || r.player_id === idB)
      .map((r) => r.id);
    await supabase.from("registrations").update({ statut: "valide" }).in("id", regIds);
  }

  revalidatePath(`/admin/tournois/${tournamentId}/inscriptions`);

  return {
    success: true,
    nbEquipes: resultat.equipes.length,
    joueursNonApparies: resultat.joueursNonApparies.length,
  };
}

const modifierJoueurSchema = z.object({
  playerId: z.string().uuid(),
  tournamentId: z.string().uuid(),
  nom: z.string().trim().min(1, "Le nom est requis."),
  prenom: z.string().trim().min(1, "Le prénom est requis."),
  sexe: z.enum(["H", "F"]).optional(),
  classementFft: z.string().trim().optional(),
  telephone: z.string().trim().optional(),
  email: z.string().trim().email("E-mail invalide.").optional().or(z.literal("")),
});

export async function modifierJoueur(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = modifierJoueurSchema.safeParse({
    playerId: formData.get("playerId"),
    tournamentId: formData.get("tournamentId"),
    nom: formData.get("nom"),
    prenom: formData.get("prenom"),
    sexe: formData.get("sexe") || undefined,
    classementFft: formData.get("classementFft") || undefined,
    telephone: formData.get("telephone") || undefined,
    email: formData.get("email") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("players")
    .update({
      nom: parsed.data.nom,
      prenom: parsed.data.prenom,
      sexe: parsed.data.sexe,
      classement_fft: parsed.data.classementFft,
      telephone: parsed.data.telephone,
      email: parsed.data.email || null,
    })
    .eq("id", parsed.data.playerId);

  if (error) {
    return { error: "Impossible de modifier ce joueur." };
  }

  revalidatePath(`/admin/tournois/${parsed.data.tournamentId}/inscriptions`);
  return { success: true };
}

const renommerEquipeSchema = z.object({
  teamId: z.string().uuid(),
  tournamentId: z.string().uuid(),
  nomAffiche: z.string().trim().min(1, "Le nom de l'équipe est requis."),
});

export async function renommerEquipe(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = renommerEquipeSchema.safeParse({
    teamId: formData.get("teamId"),
    tournamentId: formData.get("tournamentId"),
    nomAffiche: formData.get("nomAffiche"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("teams")
    .update({ nom_affiche: parsed.data.nomAffiche })
    .eq("id", parsed.data.teamId);

  if (error) {
    return { error: "Impossible de renommer l'équipe." };
  }

  revalidatePath(`/admin/tournois/${parsed.data.tournamentId}/inscriptions`);
  return { success: true };
}

export async function validerEquipe(teamId: string, tournamentId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("teams").update({ statut: "validee" }).eq("id", teamId);
  await supabase.from("registrations").update({ statut: "valide" }).eq("team_id", teamId);
  revalidatePath(`/admin/tournois/${tournamentId}/inscriptions`);
  revalidatePath(`/admin/tournois/${tournamentId}/poules`);
}

export async function supprimerEquipe(teamId: string, tournamentId: string): Promise<void> {
  const supabase = await createClient();
  // Cascade en base sur team_players et registrations : supprimer
  // l'équipe suffit. Les joueurs eux-mêmes restent dans la base.
  await supabase.from("teams").delete().eq("id", teamId);
  revalidatePath(`/admin/tournois/${tournamentId}/inscriptions`);
}

export async function remplacerJoueurEquipe(
  tournamentId: string,
  teamId: string,
  ancienPlayerId: string,
  nouveauPlayerId: string,
): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();

  const { data: dejaDansUneEquipe } = await supabase
    .from("team_players")
    .select("team_id, teams!inner(tournament_id)")
    .eq("player_id", nouveauPlayerId)
    .eq("teams.tournament_id", tournamentId)
    .maybeSingle();

  if (dejaDansUneEquipe) {
    return { error: "Ce joueur fait déjà partie d'une équipe de ce tournoi." };
  }

  const { error } = await supabase
    .from("team_players")
    .update({ player_id: nouveauPlayerId })
    .eq("team_id", teamId)
    .eq("player_id", ancienPlayerId);

  if (error) {
    return { error: "Impossible de remplacer ce joueur." };
  }

  revalidatePath(`/admin/tournois/${tournamentId}/inscriptions`);
  return { success: true };
}
