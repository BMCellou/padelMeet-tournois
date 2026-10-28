// Envoi des e-mails d'inscription (organisateurs, partenaire). Un envoi raté ne doit JAMAIS faire
// échouer une inscription ou une annulation : tout est attrapé et journalisé, rien ne remonte.

import type { createServiceClient } from "@/lib/supabase/service";
import { envoyeursReels, type Envoyeurs } from "@/lib/rappels/envoi";
import { emailValide } from "@/lib/rappels/contact";
import { chargerPlaces } from "./occupation";
import { messageNouvelleInscription, type EvenementInscription } from "./messages";

type Service = ReturnType<typeof createServiceClient>;

/** Adresses e-mail de tous les comptes administrateurs (memberships.role = 'admin'). */
export async function emailsAdmins(service: Service): Promise<string[]> {
  const { data: membres } = await service.from("memberships").select("user_id").eq("role", "admin");
  const emails = await Promise.all(
    (membres ?? []).map(async (m) => {
      const { data } = await service.auth.admin.getUserById(m.user_id);
      return emailValide(data.user?.email);
    }),
  );
  return [...new Set(emails.filter((e): e is string => !!e))];
}

async function envoyer(destinataires: string[], sujet: string, texte: string, envoyeurs: Envoyeurs) {
  for (const to of destinataires) {
    const r = await envoyeurs.email(to, sujet, texte);
    if (!r.ok) console.error(`[inscriptions] e-mail non envoyé à ${to} : ${r.error}`);
  }
}

/** Prévient les administrateurs. Ne lève jamais. */
export async function notifierAdmins(
  service: Service,
  message: { sujet: string; texte: string },
  envoyeurs: Envoyeurs = envoyeursReels,
): Promise<void> {
  try {
    const destinataires = await emailsAdmins(service);
    if (destinataires.length === 0) return;
    await envoyer(destinataires, message.sujet, message.texte, envoyeurs);
  } catch (e) {
    console.error("[inscriptions] notification des administrateurs impossible :", e);
  }
}

/** Prévient un participant (si son e-mail est exploitable). Ne lève jamais. */
export async function notifierParticipant(
  email: string | null | undefined,
  message: { sujet: string; texte: string },
  envoyeurs: Envoyeurs = envoyeursReels,
): Promise<void> {
  try {
    const to = emailValide(email);
    if (to) await envoyer([to], message.sujet, message.texte, envoyeurs);
  } catch (e) {
    console.error("[inscriptions] notification du participant impossible :", e);
  }
}

/** Prévient les administrateurs d'une inscription en ligne (solo ou paire). Ne lève jamais. */
export async function notifierNouvelleInscription(
  service: Service,
  tournamentId: string,
  evenement: EvenementInscription,
  envoyeurs: Envoyeurs = envoyeursReels,
): Promise<void> {
  try {
    const { data: tournoi } = await service
      .from("tournaments")
      .select("nom, date, max_participants")
      .eq("id", tournamentId)
      .maybeSingle();
    if (!tournoi) return;
    const places = await chargerPlaces(service, tournamentId);
    const lien = process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/admin/tournois/${tournamentId}/inscriptions`
      : null;
    const message = messageNouvelleInscription(
      {
        nom: tournoi.nom,
        dateLisible: new Date(tournoi.date).toLocaleDateString("fr-FR", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      },
      evenement,
      { occupees: places.occupees, max: tournoi.max_participants },
      lien,
    );
    await notifierAdmins(service, message, envoyeurs);
  } catch (e) {
    console.error("[inscriptions] notification d'inscription impossible :", e);
  }
}
