"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { estAdmin } from "@/lib/staff/session";
import { emailValide, normaliserTelephone, type CanalRappel } from "@/lib/rappels/contact";
import {
  chargerMatchsRappel,
  enregistrerRappel,
  envoyerRappel,
  envoyerRappelsMatchs,
  type ModeEnvoi,
} from "@/lib/rappels/service";
import { matchsDansFenetre } from "@/lib/rappels/selection";

type Resultat = { error: string } | { success: true; message?: string };

const uuid = z.string().uuid();

function rafraichir(tournamentId: string) {
  revalidatePath(`/admin/tournois/${tournamentId}/rappels`);
}

async function trouverJoueur(tournamentId: string, matchId: string, playerId: string) {
  const supabase = await createClient();
  const matchs = await chargerMatchsRappel(supabase, { tournamentId });
  const match = matchs.find((m) => m.id === matchId);
  const joueur = match && [...match.joueursA, ...match.joueursB].find((j) => j.playerId === playerId);
  return { supabase, match, joueur };
}

export async function envoyerRappelAction(
  tournamentId: string,
  matchId: string,
  playerId: string,
  mode: ModeEnvoi,
): Promise<Resultat> {
  if (!(await estAdmin())) return { error: "Non autorisé." };
  if (!uuid.safeParse(tournamentId).success || !uuid.safeParse(matchId).success || !uuid.safeParse(playerId).success) {
    return { error: "Requête invalide." };
  }

  const { supabase, match, joueur } = await trouverJoueur(tournamentId, matchId, playerId);
  if (!match || !joueur) return { error: "Match ou joueur introuvable (match déjà commencé ?)." };

  const r = await envoyerRappel(supabase, joueur, match.id, mode, "manuel");
  if (!r.ok) return { error: r.error };
  rafraichir(tournamentId);
  return { success: true };
}

/** Enregistre qu'un lien WhatsApp a été ouvert (envoi fait à la main depuis l'appli WhatsApp). */
export async function marquerWhatsAppLienEnvoye(
  tournamentId: string,
  matchId: string,
  playerId: string,
): Promise<Resultat> {
  if (!(await estAdmin())) return { error: "Non autorisé." };
  const { supabase, match, joueur } = await trouverJoueur(tournamentId, matchId, playerId);
  if (!match || !joueur) return { error: "Match ou joueur introuvable." };

  await enregistrerRappel(supabase, match.id, joueur.playerId, "whatsapp", "manuel");
  rafraichir(tournamentId);
  return { success: true };
}

export async function envoyerRappelsEnAttenteAction(
  tournamentId: string,
  delaiHeures: number,
): Promise<Resultat> {
  if (!(await estAdmin())) return { error: "Non autorisé." };
  const delai = z.number().int().min(1).max(168).safeParse(delaiHeures);
  if (!uuid.safeParse(tournamentId).success || !delai.success) return { error: "Requête invalide." };

  const supabase = await createClient();
  const tous = await chargerMatchsRappel(supabase, { tournamentId });
  const aRappeler = matchsDansFenetre(tous, new Date(), delai.data);
  const bilan = await envoyerRappelsMatchs(supabase, aRappeler, "manuel");

  rafraichir(tournamentId);
  const resume = `${bilan.envoyes} rappel(s) envoyé(s).`;
  if (bilan.erreurs.length > 0) {
    return { error: `${resume} Échecs : ${bilan.erreurs.join(" | ")}` };
  }
  return { success: true, message: resume };
}

const contactSchema = z.object({
  playerId: uuid,
  canal: z.enum(["email", "whatsapp"]),
  valeur: z.string().trim(),
});

/** Change le canal préféré d'un joueur et/ou son e-mail (canal e-mail) ou son numéro (canal WhatsApp). */
export async function modifierContactJoueur(
  tournamentId: string,
  playerId: string,
  canal: CanalRappel,
  valeur: string,
): Promise<Resultat> {
  if (!(await estAdmin())) return { error: "Non autorisé." };
  const parsed = contactSchema.safeParse({ playerId, canal, valeur });
  if (!parsed.success) return { error: "Requête invalide." };

  const champ: { canal_rappel: CanalRappel; email?: string; telephone?: string } = {
    canal_rappel: parsed.data.canal,
  };
  if (parsed.data.valeur !== "") {
    if (parsed.data.canal === "email") {
      const email = emailValide(parsed.data.valeur);
      if (!email) return { error: "E-mail invalide." };
      champ.email = email;
    } else {
      if (!normaliserTelephone(parsed.data.valeur)) return { error: "Numéro invalide." };
      champ.telephone = parsed.data.valeur;
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.from("players").update(champ).eq("id", parsed.data.playerId);
  if (error) return { error: "Impossible d'enregistrer." };

  rafraichir(tournamentId);
  return { success: true };
}

const parametresSchema = z.object({
  cronActif: z.boolean(),
  delaiAvantHeures: z.number().int().min(1).max(72),
});

export async function modifierParametresRappels(
  tournamentId: string,
  cronActif: boolean,
  delaiAvantHeures: number,
): Promise<Resultat> {
  if (!(await estAdmin())) return { error: "Non autorisé." };
  const parsed = parametresSchema.safeParse({ cronActif, delaiAvantHeures });
  if (!parsed.success) return { error: "Le délai doit être entre 1 et 72 heures." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("parametres_rappels")
    .update({ cron_actif: parsed.data.cronActif, delai_avant_heures: parsed.data.delaiAvantHeures })
    .eq("id", true);
  if (error) return { error: "Impossible d'enregistrer." };

  rafraichir(tournamentId);
  return { success: true };
}
