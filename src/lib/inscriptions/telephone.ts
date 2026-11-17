// Le numéro de téléphone est obligatoire pour tout joueur qui s'inscrit à un tournoi : c'est le moyen
// le plus réactif de le joindre le jour J. Pur : partagé par la création de compte, le profil et
// l'inscription en paire (partenaire compris).

import { z } from "zod";
import { normaliserTelephone } from "@/lib/rappels/contact";

export const MESSAGE_TELEPHONE_REQUIS = "Le numéro de téléphone est requis.";
export const MESSAGE_TELEPHONE_INVALIDE = "Numéro de téléphone invalide (ex. 06 12 34 56 78 ou +33 6 12 34 56 78).";
export const MESSAGE_TELEPHONE_FACTICE =
  "Ce numéro ne semble pas réel (numéro d'exemple, suite de chiffres ou préfixe inexistant) : saisis ton vrai numéro.";
export const MESSAGE_TELEPHONE_PROFIL =
  "Ajoute ton numéro de téléphone dans ton profil (Mon compte) pour pouvoir t'inscrire : l'organisateur en a besoin pour te joindre le jour du tournoi.";

const SUITES = ["0123456789", "9876543210"];

/**
 * Le numéro ressemble-t-il à un vrai numéro ? On ne peut pas prouver qu'un numéro existe (il faudrait un SMS de
 * vérification), mais on écarte les saisies de test : numéro d'exemple du formulaire (06 12 34 56 78), suites de
 * chiffres, chiffres répétés, préfixe français inexistant (le 0 est suivi de 1 à 7 ou 9 ; le 08 est un numéro de
 * service qui ne joint pas une personne). N'agit qu'à la saisie : les numéros déjà enregistrés restent utilisables.
 */
export function telephonePlausible(brut: string | null | undefined): boolean {
  const n = normaliserTelephone(brut);
  if (n === null || n.startsWith("0")) return false;
  if (n.startsWith("33") && !/^[1-79]\d{8}$/.test(n.slice(2))) return false;
  const abonne = n.slice(-8);
  if (new Set(abonne).size <= 2) return false;
  return !SUITES.some((suite) => suite.includes(abonne));
}

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
    .refine((valeur) => normaliserTelephone(valeur) !== null, invalide)
    .refine((valeur) => normaliserTelephone(valeur) === null || telephonePlausible(valeur), MESSAGE_TELEPHONE_FACTICE);
}

export const telephoneObligatoire = schemaTelephone();

/** Le joueur a-t-il un numéro exploitable ? (profils créés avant l'obligation : souvent non) */
export function aUnTelephoneValide(telephone: string | null | undefined): boolean {
  return normaliserTelephone(telephone) !== null;
}
