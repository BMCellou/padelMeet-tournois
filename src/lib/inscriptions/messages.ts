// Textes des e-mails liés aux inscriptions. Purs : aucun envoi ici (voir notifier.ts).

export interface InfosTournoi {
  nom: string;
  /** Date lisible, ex. « samedi 10 octobre 2026 ». */
  dateLisible: string;
}

export type EvenementInscription =
  | { type: "solo"; joueur: string }
  | { type: "paire"; joueur: string; partenaire: string };

export interface PlacesApres {
  occupees: number;
  /** null = illimité */
  max: number | null;
}

function ligneComplement(places: PlacesApres): string {
  return places.max === null
    ? `${places.occupees} joueur(s) inscrit(s), pas de limite.`
    : `${places.occupees} / ${places.max} joueurs inscrits.`;
}

/** E-mail à l'organisateur : quelqu'un vient de s'inscrire en ligne. */
export function messageNouvelleInscription(
  t: InfosTournoi,
  e: EvenementInscription,
  places: PlacesApres,
  lienAdmin: string | null,
): { sujet: string; texte: string } {
  const qui =
    e.type === "paire"
      ? `${e.joueur} s'est inscrit(e) en paire avec ${e.partenaire}`
      : `${e.joueur} s'est inscrit(e) seul(e)`;
  const suite =
    e.type === "paire" ? "L'équipe est en attente de ta validation." : "Il/elle attend d'être apparié(e).";
  return {
    sujet: `Nouvelle inscription — ${t.nom}`,
    texte: [
      `${qui} au tournoi « ${t.nom} » (${t.dateLisible}).`,
      suite,
      ligneComplement(places),
      lienAdmin ? `\nGérer les inscriptions : ${lienAdmin}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

/** E-mail à l'organisateur : un participant a annulé. */
export function messageAnnulationOrganisateur(
  t: InfosTournoi,
  joueur: string,
  partenaire: string | null,
  places: PlacesApres,
  lienAdmin: string | null,
): { sujet: string; texte: string } {
  const qui = partenaire ? `${joueur} a annulé l'inscription de sa paire (avec ${partenaire})` : `${joueur} a annulé son inscription`;
  return {
    sujet: `Annulation — ${t.nom}`,
    texte: [`${qui} au tournoi « ${t.nom} » (${t.dateLisible}).`, ligneComplement(places), lienAdmin ? `\nGérer les inscriptions : ${lienAdmin}` : ""]
      .filter(Boolean)
      .join("\n"),
  };
}

/** E-mail au/à la partenaire dont l'inscription en paire vient d'être annulée par l'autre joueur. */
export function messageAnnulationPartenaire(
  t: InfosTournoi,
  joueur: string,
): { sujet: string; texte: string } {
  return {
    sujet: `Inscription annulée — ${t.nom}`,
    texte: `${joueur} a annulé votre inscription en paire au tournoi « ${t.nom} » (${t.dateLisible}). Vous n'êtes donc plus inscrit(e). Tu peux t'inscrire à nouveau, seul(e) ou avec un autre partenaire, tant que les inscriptions sont ouvertes.`,
  };
}
