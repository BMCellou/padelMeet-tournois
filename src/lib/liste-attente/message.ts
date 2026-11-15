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
