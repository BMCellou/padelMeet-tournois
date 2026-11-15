// Information RGPD affichée sous le formulaire de la liste d'attente (article 13 du RGPD) et texte de la case
// de consentement. La version est enregistrée avec chaque inscription : si ce texte change sur le fond,
// incrémente-la pour savoir quel texte chaque personne a accepté.

export const VERSION_RGPD = "2026-11-v2";

export const DUREE_CONSERVATION_MOIS = 24;

/** Adresse de contact de l'organisateur, publiée dans l'information RGPD et les mentions légales. */
export const CONTACT_GLOBOPADEL = "contact@globopadel.fr";

export const LIBELLE_CONSENTEMENT =
  "J'accepte que Globopadel utilise mes informations pour me prévenir du prochain tournoi.";

export interface SectionRgpd {
  titre: string;
  texte: string;
}

export function sectionsRgpd(contact: string = CONTACT_GLOBOPADEL): SectionRgpd[] {
  return [
    {
      titre: "Qui collecte tes données",
      texte: `Globopadel, organisateur de tournois de padel et éditeur du site app.globopadel.fr, est responsable de ce traitement. Contact : ${contact}.`,
    },
    {
      titre: "Pourquoi",
      texte:
        "Te prévenir (par e-mail, SMS, WhatsApp ou appel) dès que la date et le lieu du prochain tournoi sont connus, et t'envoyer le lien d'inscription. Rien d'autre : tes données ne servent pas à de la publicité et ne sont ni vendues ni cédées.",
    },
    {
      titre: "Sur quelle base",
      texte: "Ton consentement, donné en cochant la case. Tu peux le retirer à tout moment, sans avoir à te justifier.",
    },
    {
      titre: "Quelles données",
      texte:
        "Prénom, nom, e-mail, téléphone, niveau de jeu (de 1 à 8), et ta ville si tu la renseignes (facultatif). Ton e-mail et ton téléphone sont demandés pour pouvoir te joindre ; le niveau sert à te proposer un tournoi adapté.",
    },
    {
      titre: "Qui y a accès",
      texte:
        "Globopadel uniquement. Ses prestataires techniques, qui hébergent les données et envoient les messages, n'agissent que sur ses instructions et n'en font aucun autre usage.",
    },
    {
      titre: "Combien de temps",
      texte: `Jusqu'au prochain tournoi, et au plus ${DUREE_CONSERVATION_MOIS} mois après ton inscription. Tu es supprimé(e) avant si tu te désinscris.`,
    },
    {
      titre: "Tes droits",
      texte: `Tu peux accéder à tes données, les faire corriger, les faire effacer, limiter leur usage ou t'opposer à leur traitement, et retirer ton consentement, en cliquant sur le lien de désinscription présent dans chaque message (suppression immédiate) ou en écrivant à ${contact}. Tu peux aussi saisir la CNIL (cnil.fr) si tu estimes que tes droits ne sont pas respectés.`,
    },
  ];
}
