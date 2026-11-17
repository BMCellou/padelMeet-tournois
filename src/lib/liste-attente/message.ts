// Message envoyé à la liste d'attente : texte par défaut, pied de page de désinscription obligatoire.
// Pur : aucun envoi, aucune base de données.

import { verifierMessage } from "@/lib/messages/inscrits";

export const MODELE_ANNONCE = {
  sujet: "Le prochain tournoi GloboPadel est annoncé",
  texte: `Bonjour {prenom},

Tu t'étais inscrit(e) sur la liste d'attente de GloboPadel : le prochain tournoi est annoncé !

Date : [à compléter]
Lieu : [à compléter]
Format et niveau : [à compléter]

Inscription (places limitées) : [à compléter]

À très vite sur les terrains !`,
};

/**
 * Message envoyé tout de suite après l'inscription : preuve que l'adresse est la bonne, rappel de ce qui va se
 * passer et de la durée de conservation, et lien de désinscription personnel. Un seul lien utile en plus de celui-là.
 * `base` est l'adresse du site (sans « / » final).
 */
export function messageConfirmation(prenom: string, base: string, token: string, dureeMois: number) {
  const site = base.replace(/\/+$/, "");
  const texte = `Bonjour ${prenom},

Ton inscription sur la liste d'attente de GloboPadel est bien enregistrée. Tu n'as rien d'autre à faire : on te prévient par e-mail, et au besoin par téléphone, dès que la date et le lieu du prochain tournoi sont connus, avant l'ouverture des inscriptions.

Pour t'inscrire en un clic le jour de l'annonce, tu peux créer ton compte dès maintenant : ${site}/compte/inscription

Tes informations sont conservées ${dureeMois} mois au plus.${piedDeDesinscription(lienDesinscription(site, token))}`;
  return { sujet: "Tu es sur la liste d'attente GloboPadel", texte };
}

/** Lien de désinscription d'une personne ; `base` est l'adresse du site (sans « / » final). */
export function lienDesinscription(base: string, token: string): string {
  return `${base.replace(/\/+$/, "")}/liste-attente/desinscription/${token}`;
}

/**
 * Pied de page ajouté à chaque message, non modifiable : rappelle pourquoi la personne le reçoit et lui donne le
 * moyen de se désinscrire en un clic (obligation d'information du RGPD).
 */
export function piedDeDesinscription(lien: string): string {
  return `\n\n--\nTu reçois ce message parce que tu t'es inscrit(e) sur la liste d'attente de GloboPadel.\nPour ne plus en recevoir et supprimer tes données : ${lien}`;
}

/** Message d'erreur si le message n'est pas envoyable, sinon null (mêmes règles que les messages aux inscrits). */
export function verifierMessageListe(sujet: string, texte: string): string | null {
  return verifierMessage(sujet, texte);
}
