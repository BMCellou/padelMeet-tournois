"use server";

import { createClient } from "@/lib/supabase/server";
import { apparierSolos, type JoueurSolo, type StrategieAppariement } from "@/lib/engine/appariement";
import { creerRng } from "@/lib/engine/rng";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const joueurSchema = z.object({
  nom: z.string().trim().min(1, "Le nom est requis."),
  prenom: z.string().trim().min(1, "Le prénom est requis."),
  sexe: z.enum(["H", "F"]).optional(),
  classementFft: z.string().trim().optional(),
});

const pairSchema = z.object({
  tournamentId: z.string().uuid(),
  nomA: z.string().trim().min(1),
  prenomA: z.string().trim().min(1),
  sexeA: z.enum(["H", "F"]).optional(),
  classementA: z.string().trim().optional(),
  nomB: z.string().trim().min(1),
  prenomB: z.string().trim().min(1),
  sexeB: z.enum(["H", "F"]).optional(),
  classementB: z.string().trim().optional(),
});

type ActionResult = { error: string } | { success: true };

export async function ajouterPaire(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = pairSchema.safeParse({
    tournamentId: formData.get("tournamentId"),
    nomA: formData.get("nomA"),
    prenomA: formData.get("prenomA"),
    sexeA: formData.get("sexeA") || undefined,
    classementA: formData.get("classementA") || undefined,
    nomB: formData.get("nomB"),
    prenomB: formData.get("prenomB"),
    sexeB: formData.get("sexeB") || undefined,
    classementB: formData.get("classementB") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { tournamentId, ...d } = parsed.data;

  const { data: joueurs, error: joueursError } = await supabase
    .from("players")
    .insert([
      { nom: d.nomA, prenom: d.prenomA, sexe: d.sexeA, classement_fft: d.classementA },
      { nom: d.nomB, prenom: d.prenomB, sexe: d.sexeB, classement_fft: d.classementB },
    ])
    .select("id");

  if (joueursError || !joueurs || joueurs.length !== 2) {
    return { error: "Impossible de créer les joueurs." };
  }

  const { data: team, error: teamError } = await supabase
    .from("teams")
    .insert({
      tournament_id: tournamentId,
      nom_affiche: `${d.prenomA} ${d.nomA} / ${d.prenomB} ${d.nomB}`,
      origine: "paire",
    })
    .select("id")
    .single();

  if (teamError || !team) {
    return { error: "Impossible de créer l'équipe." };
  }

  const { error: tpError } = await supabase.from("team_players").insert([
    { team_id: team.id, player_id: joueurs[0].id },
    { team_id: team.id, player_id: joueurs[1].id },
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
  ...joueurSchema.shape,
});

export async function ajouterSolo(
  _prevState: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = soloSchema.safeParse({
    tournamentId: formData.get("tournamentId"),
    nom: formData.get("nom"),
    prenom: formData.get("prenom"),
    sexe: formData.get("sexe") || undefined,
    classementFft: formData.get("classementFft") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { tournamentId, ...d } = parsed.data;

  const { data: joueur, error: joueurError } = await supabase
    .from("players")
    .insert({ nom: d.nom, prenom: d.prenom, sexe: d.sexe, classement_fft: d.classementFft })
    .select("id")
    .single();

  if (joueurError || !joueur) {
    return { error: "Impossible de créer le joueur." };
  }

  const { error: regError } = await supabase.from("registrations").insert({
    tournament_id: tournamentId,
    type: "solo",
    player_id: joueur.id,
    statut: "en_attente",
  });

  if (regError) {
    return { error: "Impossible d'inscrire le joueur." };
  }

  revalidatePath(`/admin/tournois/${tournamentId}/inscriptions`);
  return { success: true };
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
