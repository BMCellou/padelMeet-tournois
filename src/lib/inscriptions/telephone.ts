// Le numéro de téléphone est obligatoire pour tout joueur qui s'inscrit à un tournoi : c'est le moyen
// le plus réactif de le joindre le jour J. Pur : partagé par la création de compte, le profil et
// l'inscription en paire (partenaire compris).

import { z } from "zod";
import { normaliserTelephone } from "@/lib/rappels/contact";

export const MESSAGE_TELEPHONE_REQUIS = "Le numéro de téléphone est requis.";
export const MESSAGE_TELEPHONE_INVALIDE = "Numéro de téléphone invalide (ex. 06 12 34 56 78 ou +33 6 12 34 56 78).";
export const MESSAGE_TELEPHONE_PROFIL =
  "Ajoute ton numéro de téléphone dans ton profil (Mon compte) pour pouvoir t'inscrire : l'organisateur en a besoin pour te joindre le jour du tournoi.";

/**
 * Numéro obligatoire et exploitable (français local ou international), conservé tel que saisi.
 * `de` précise de qui il s'agit dans les messages (« du/de la partenaire »).
 */
export function schemaTelephone(de = "") {
  const requis = de ? `Le numéro de téléphone ${de} est requis.` : MESSAGE_TELEPHONE_REQUIS;
  const invalide = de ? `Le numéro de téléphone ${de} est invalide (ex. 06 12 34 56 78).` : MESSAGE_TELEPHONE_INVALIDE;
  return z
    .string({ error: requis })
    .trim()
    .min(1, requis)
    .refine((valeur) => normaliserTelephone(valeur) !== null, invalide);
}

export const telephoneObligatoire = schemaTelephone();

/** Le joueur a-t-il un numéro exploitable ? (profils créés avant l'obligation : souvent non) */
export function aUnTelephoneValide(telephone: string | null | undefined): boolean {
  return normaliserTelephone(telephone) !== null;
}
