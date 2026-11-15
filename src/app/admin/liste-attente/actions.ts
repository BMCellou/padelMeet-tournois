"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { estAdmin } from "@/lib/staff/session";
import { envoyeursReels } from "@/lib/rappels/envoi";
import { emailValide } from "@/lib/rappels/contact";
import { executerParLots, NB_DESTINATAIRES_MAX, personnaliser } from "@/lib/messages/inscrits";
import { lienDesinscription, piedDeDesinscription, verifierMessageListe } from "@/lib/liste-attente/message";
import { DUREE_CONSERVATION_MOIS } from "@/lib/liste-attente/rgpd";
import type { Json } from "@/lib/supabase/database.types";

type Resultat = { error: string } | { success: true; message?: string };
type ResultatEnvoi = { error: string } | { success: true; envoyes: number; erreurs: string[]; essai: boolean };

const ENVOIS_SIMULTANES = 5;

const envoiSchema = z.object({
  sujet: z.string(),
  texte: z.string(),
  ids: z.array(z.string().uuid()).max(NB_DESTINATAIRES_MAX),
  essai: z.boolean(),
});

/**
 * Envoie le message aux personnes choisies (leurs adresses viennent de la base, le navigateur n'envoie que des
 * identifiants). Chaque message porte son lien de désinscription personnel ; une personne prévenue est marquée.
 * En mode essai, seul l'administrateur connecté reçoit le message.
 */
export async function envoyerMessageListeAttente(entree: unknown): Promise<ResultatEnvoi> {
  if (!(await estAdmin())) return { error: "Non autorisé." };
  const parsed = envoiSchema.safeParse(entree);
  if (!parsed.success) return { error: parsed.error.issues[0].message.includes("Too big") ? `Au plus ${NB_DESTINATAIRES_MAX} personnes par envoi.` : "Requête invalide." };
  const { sujet, texte, ids, essai } = parsed.data;

  const erreurMessage = verifierMessageListe(sujet, texte);
  if (erreurMessage) return { error: erreurMessage };

  const base = process.env.NEXT_PUBLIC_SITE_URL;
  if (!base) return { error: "NEXT_PUBLIC_SITE_URL n'est pas configurée : impossible de construire le lien de désinscription." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let destinataires: { id: string | null; prenom: string; nom: string; email: string; token: string }[];
  if (essai) {
    if (!user?.email) return { error: "Ton compte n'a pas d'adresse e-mail pour recevoir l'essai." };
    destinataires = [{ id: null, prenom: "Prénom", nom: "Nom", email: user.email, token: "0".repeat(32) }];
  } else {
    if (ids.length === 0) return { error: "Aucun destinataire sélectionné." };
    const { data } = await supabase
      .from("liste_attente")
      .select("id, prenom, nom, email, token_desinscription")
      .in("id", ids);
    destinataires = (data ?? []).flatMap((r) => {
      const email = emailValide(r.email);
      return email ? [{ id: r.id, prenom: r.prenom, nom: r.nom, email, token: r.token_desinscription }] : [];
    });
    if (destinataires.length === 0) return { error: "Aucun destinataire avec une adresse e-mail valide." };
  }

  const sujetEnvoye = essai ? `[ESSAI] ${sujet}` : sujet;
  const bilans = await executerParLots(destinataires, ENVOIS_SIMULTANES, async (d) => {
    const corps = personnaliser(texte, d) + piedDeDesinscription(lienDesinscription(base, d.token));
    const r = await envoyeursReels.email(d.email, personnaliser(sujetEnvoye, d), corps);
    return { id: d.id, erreur: r.ok ? null : `${d.prenom} ${d.nom} (${d.email}) : ${r.error}` };
  });

  const envoyesIds = bilans.flatMap((b) => (b.erreur === null && b.id ? [b.id] : []));
  if (envoyesIds.length > 0) {
    await supabase.from("liste_attente").update({ notifie_at: new Date().toISOString() }).in("id", envoyesIds);
  }
  const erreurs = bilans.flatMap((b) => (b.erreur ? [b.erreur] : []));

  await supabase.from("audit_log").insert({
    acteur: user?.email ?? "admin",
    action: essai ? "message_liste_attente_essai" : "message_liste_attente",
    payload: { sujet, destinataires: destinataires.length, envoyes: destinataires.length - erreurs.length, echecs: erreurs.length } as Json,
  });

  revalidatePath("/admin/liste-attente");
  return { success: true, envoyes: destinataires.length - erreurs.length, erreurs, essai };
}

/** Retire une personne de la liste (suppression définitive). */
export async function supprimerDeLaListe(id: string): Promise<Resultat> {
  if (!(await estAdmin())) return { error: "Non autorisé." };
  if (!z.string().uuid().safeParse(id).success) return { error: "Requête invalide." };
  const supabase = await createClient();
  const { error } = await supabase.from("liste_attente").delete().eq("id", id);
  if (error) return { error: "Impossible de supprimer cette personne." };
  revalidatePath("/admin/liste-attente");
  return { success: true };
}

/** Supprime les inscriptions plus anciennes que la durée de conservation annoncée dans l'information RGPD. */
export async function purgerAnciennesInscriptions(): Promise<Resultat> {
  if (!(await estAdmin())) return { error: "Non autorisé." };
  const limite = new Date();
  limite.setMonth(limite.getMonth() - DUREE_CONSERVATION_MOIS);
  const supabase = await createClient();
  const { data, error } = await supabase.from("liste_attente").delete().lt("created_at", limite.toISOString()).select("id");
  if (error) return { error: "Impossible de purger la liste." };
  revalidatePath("/admin/liste-attente");
  return { success: true, message: `${data?.length ?? 0} inscription(s) de plus de ${DUREE_CONSERVATION_MOIS} mois supprimée(s).` };
}
