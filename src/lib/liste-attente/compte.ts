// Liens entre la liste d'attente et les comptes joueurs. Pur : aucune base de données.

export interface ProfilConnecte {
  prenom: string;
  nom: string;
  email: string;
  /** null pour un profil créé avant que le numéro soit obligatoire. */
  telephone: string | null;
}

export interface SaisieConnecte {
  telephone: unknown;
  niveau: unknown;
  ville: unknown;
  consentement: unknown;
}

/**
 * Données à valider pour inscrire une personne connectée. L'identité vient toujours du profil (la session),
 * jamais du formulaire : seuls le niveau, la ville, le consentement et — faute de numéro au profil — le téléphone
 * sont saisis.
 */
export function donneesDepuisProfil(profil: ProfilConnecte, saisie: SaisieConnecte) {
  return {
    prenom: profil.prenom,
    nom: profil.nom,
    email: profil.email,
    telephone: profil.telephone ?? saisie.telephone,
    niveau: saisie.niveau,
    ville: saisie.ville,
    consentement: saisie.consentement,
  };
}

/** Adresses (en minuscules) des fiches joueur rattachées à un compte : celles des inscrits qui ont déjà un compte. */
export function emailsAvecCompte(joueurs: { email: string | null; user_id: string | null }[]): Set<string> {
  const emails = new Set<string>();
  for (const j of joueurs) {
    if (j.user_id && j.email) emails.add(j.email.trim().toLowerCase());
  }
  return emails;
}

export function aUnCompte(email: string, avecCompte: Set<string>): boolean {
  return avecCompte.has(email.trim().toLowerCase());
}
