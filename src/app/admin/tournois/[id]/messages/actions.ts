"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { estAdmin } from "@/lib/staff/session";
import { envoyeursReels, type PieceJointe } from "@/lib/rappels/envoi";
import { chargerDonneesTournoi, nomFichierPdf } from "@/lib/pdf/charger";
import { genererPlanningParticipants } from "@/lib/pdf/dossier";
import { construireCreneaux } from "@/lib/pdf/mise-en-page";
import { chargerDestinatairesTournoi } from "@/lib/messages/charger";
import {
  NB_DESTINATAIRES_MAX,
  executerParLots,
  personnaliser,
  verifierMessage,
} from "@/lib/messages/inscrits";
import type { Json } from "@/lib/supabase/database.types";

type Resultat =
  | { error: string }
  | { success: true; envoyes: number; erreurs: string[]; essai: boolean };

const schema = z.object({
  tournamentId: z.string().uuid(),
  sujet: z.string(),
  texte: z.string(),
  playerIds: z.array(z.string().uuid()).max(NB_DESTINATAIRES_MAX),
  joindrePlanning: z.boolean(),
  essai: z.boolean(),
});

/** Nombre d'e-mails envoyés en même temps : assez pour rester sous la limite de durée, sans saturer Make. */
const ENVOIS_SIMULTANES = 5;

/**
 * Envoie un message personnalisé aux inscrits choisis, avec en option le planning (PDF généré à
 * l'instant). En mode essai, le message ne part que vers l'adresse de l'administrateur connecté.
 * Les adresses viennent toujours de la base : le navigateur n'envoie que des identifiants.
 */
export async function envoyerMessageInscrits(entree: unknown): Promise<Resultat> {
  if (!(await estAdmin())) return { error: "Non autorisé." };
  const parsed = schema.safeParse(entree);
  if (!parsed.success) return { error: "Requête invalide." };
  const { tournamentId, sujet, texte, playerIds, joindrePlanning, essai } = parsed.data;

  const erreurMessage = verifierMessage(sujet, texte);
  if (erreurMessage) return { error: erreurMessage };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let destinataires: { prenom: string; nom: string; email: string }[];
  if (essai) {
    if (!user?.email) return { error: "Ton compte n'a pas d'adresse e-mail pour recevoir l'essai." };
    destinataires = [{ prenom: "Prénom", nom: "Nom", email: user.email }];
  } else {
    const choisis = new Set(playerIds);
    const tous = await chargerDestinatairesTournoi(supabase, tournamentId);
    destinataires = tous.flatMap((d) => (choisis.has(d.playerId) && d.email ? [{ ...d, email: d.email }] : []));
    if (destinataires.length === 0) return { error: "Aucun destinataire avec une adresse e-mail valide." };
  }

  const piecesJointes: PieceJointe[] = [];
  if (joindrePlanning) {
    const donnees = await chargerDonneesTournoi(supabase, tournamentId);
    if (!donnees) return { error: "Tournoi introuvable." };
    if (construireCreneaux(donnees).length === 0) {
      return { error: "Le planning n'est pas encore généré : génère le calendrier ou décoche la pièce jointe." };
    }
    const pdf = await genererPlanningParticipants(donnees, new Date());
    piecesJointes.push({
      nom: nomFichierPdf("planning", donnees.tournoi.nom),
      contenuBase64: Buffer.from(pdf.bytes).toString("base64"),
    });
  }

  const sujetEnvoye = essai ? `[ESSAI] ${sujet}` : sujet;
  const bilans = await executerParLots(destinataires, ENVOIS_SIMULTANES, async (d) => {
    const r = await envoyeursReels.email(d.email, personnaliser(sujetEnvoye, d), personnaliser(texte, d), piecesJointes);
    return r.ok ? null : `${d.prenom} ${d.nom} (${d.email}) : ${r.error}`;
  });
  const erreurs = bilans.filter((b): b is string => b !== null);
  const envoyes = destinataires.length - erreurs.length;

  await supabase.from("audit_log").insert({
    tournament_id: tournamentId,
    acteur: user?.email ?? "admin",
    action: essai ? "message_inscrits_essai" : "message_inscrits",
    payload: {
      sujet,
      destinataires: destinataires.length,
      envoyes,
      echecs: erreurs.length,
      planningJoint: piecesJointes.length > 0,
    } as Json,
  });

  return { success: true, envoyes, erreurs, essai };
}
