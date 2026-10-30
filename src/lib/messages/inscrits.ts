// Message personnalisé aux inscrits d'un tournoi : destinataires, texte et
// vérifications. Pur : aucune base de données, aucun envoi.

import { emailValide } from "@/lib/rappels/contact";

/** Texte à remplacer avant l'envoi : l'envoi est refusé tant qu'il figure dans le message. */
export const MARQUEUR_A_COMPLETER = "[à compléter]";

export const LONGUEUR_MAX_SUJET = 150;
export const LONGUEUR_MAX_TEXTE = 5000;
export const NB_DESTINATAIRES_MAX = 100;

export interface Destinataire {
  playerId: string;
  prenom: string;
  nom: string;
  /** null si l'e-mail est absent ou invalide : le joueur ne peut pas être contacté. */
  email: string | null;
  /** Inscription acceptée par le club (équipe validée ou joueur seul validé). */
  valide: boolean;
}

interface JoueurBrut {
  id: string;
  prenom: string;
  nom: string;
  email: string | null;
}

/**
 * Un joueur apparaît une seule fois, même s'il a à la fois une inscription solo et une équipe ;
 * il est « validé » dès qu'une de ses inscriptions l'est.
 */
export function construireDestinataires(
  equipes: { statut: string; joueurs: JoueurBrut[] }[],
  solos: { statut: string; joueur: JoueurBrut | null }[],
): Destinataire[] {
  const parId = new Map<string, Destinataire>();
  const ajouter = (j: JoueurBrut, valide: boolean) => {
    const existant = parId.get(j.id);
    if (existant) {
      existant.valide = existant.valide || valide;
      return;
    }
    parId.set(j.id, { playerId: j.id, prenom: j.prenom, nom: j.nom, email: emailValide(j.email), valide });
  };
  for (const e of equipes) for (const j of e.joueurs) ajouter(j, e.statut === "validee");
  for (const s of solos) if (s.joueur) ajouter(s.joueur, s.statut === "valide");
  return [...parId.values()].sort((a, b) => a.nom.localeCompare(b.nom, "fr") || a.prenom.localeCompare(b.prenom, "fr"));
}

/** Remplace `{prenom}` et `{nom}` par ceux du destinataire. */
export function personnaliser(texte: string, joueur: { prenom: string; nom: string }): string {
  return texte.replaceAll("{prenom}", joueur.prenom).replaceAll("{nom}", joueur.nom);
}

/** Message d'erreur si le message n'est pas envoyable, sinon null. */
export function verifierMessage(sujet: string, texte: string): string | null {
  if (sujet.trim() === "") return "Le sujet est requis.";
  if (texte.trim() === "") return "Le message est vide.";
  if (sujet.length > LONGUEUR_MAX_SUJET) return `Le sujet dépasse ${LONGUEUR_MAX_SUJET} caractères.`;
  if (texte.length > LONGUEUR_MAX_TEXTE) return `Le message dépasse ${LONGUEUR_MAX_TEXTE} caractères.`;
  if (sujet.includes(MARQUEUR_A_COMPLETER) || texte.includes(MARQUEUR_A_COMPLETER)) {
    return `Remplace « ${MARQUEUR_A_COMPLETER} » dans le message (par exemple le code d'accès au club) avant d'envoyer.`;
  }
  return null;
}

export interface InfosModele {
  nom: string;
  /** « samedi 16 janvier 2027 » */
  dateLisible: string;
  /** « 09:00 » */
  heure: string;
  club: string | null;
}

/** Message d'infos pratiques pré-rempli ; le code d'accès est à saisir par l'organisateur. */
export function modeleInfosPratiques(t: InfosModele): { sujet: string; texte: string } {
  return {
    sujet: `Infos pratiques — ${t.nom}`,
    texte: [
      "Bonjour {prenom},",
      "",
      `Voici les informations pour le tournoi « ${t.nom} ».`,
      "",
      `Date : ${t.dateLisible}, début à ${t.heure}`,
      ...(t.club ? [`Lieu : ${t.club}`] : []),
      `Code d'accès au club : ${MARQUEUR_A_COMPLETER}`,
      "",
      "Le planning du déroulé est en pièce jointe.",
      "",
      "À très vite sur le terrain !",
    ].join("\n"),
  };
}

/** Exécute `tache` sur chaque élément, `taille` à la fois ; l'ordre des résultats est celui des éléments. */
export async function executerParLots<T, R>(
  elements: T[],
  taille: number,
  tache: (element: T) => Promise<R>,
): Promise<R[]> {
  const resultats: R[] = [];
  for (let i = 0; i < elements.length; i += taille) {
    resultats.push(...(await Promise.all(elements.slice(i, i + taille).map(tache))));
  }
  return resultats;
}
