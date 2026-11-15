// Identité de l'éditeur du site, publiée dans les mentions légales (loi pour la confiance dans l'économie
// numérique, article 6-III). Un champ à `null` n'est pas affiché : renseigne-le dès que l'information existe
// (immatriculation de l'entité, adresse du siège, etc.) ; la page se met à jour toute seule.

import { CONTACT_GLOBOPADEL } from "@/lib/liste-attente/rgpd";

export interface Editeur {
  denomination: string;
  formeJuridique: string | null;
  capitalSocial: string | null;
  siegeSocial: string | null;
  /** SIREN / numéro d'immatriculation (RCS ou RNE). */
  immatriculation: string | null;
  tvaIntracommunautaire: string | null;
  telephone: string | null;
  email: string;
  /** Personne physique responsable de la publication (nom et prénom). */
  directeurPublication: string | null;
}

export const EDITEUR: Editeur = {
  denomination: "Globopadel",
  formeJuridique: null,
  capitalSocial: null,
  siegeSocial: null,
  immatriculation: null,
  tvaIntracommunautaire: null,
  telephone: null,
  email: CONTACT_GLOBOPADEL,
  directeurPublication: null,
};

export interface Hebergeur {
  nom: string;
  adresse: string;
  site: string;
}

/** Hébergeur du site : sa mention est obligatoire. */
export const HEBERGEUR: Hebergeur = {
  nom: "Vercel Inc.",
  adresse: "440 N Barranca Ave #4133, Covina, CA 91723, États-Unis",
  site: "https://vercel.com",
};

export const URL_SITE = "https://app.globopadel.fr";

/** Lignes « libellé : valeur » de l'identité de l'éditeur, sans les champs encore inconnus. */
export function lignesEditeur(e: Editeur): [string, string][] {
  const lignes: [string, string | null][] = [
    ["Éditeur", e.denomination],
    ["Forme juridique", e.formeJuridique],
    ["Capital social", e.capitalSocial],
    ["Siège social", e.siegeSocial],
    ["Immatriculation", e.immatriculation],
    ["TVA intracommunautaire", e.tvaIntracommunautaire],
    ["Téléphone", e.telephone],
    ["E-mail", e.email],
  ];
  return lignes.filter((l): l is [string, string] => l[1] !== null && l[1].trim() !== "");
}
