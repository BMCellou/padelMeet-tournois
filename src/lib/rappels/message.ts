// Contenu d'un rappel de match — pur, partagé par l'e-mail, le lien
// WhatsApp et le modèle WhatsApp de l'API.

const FUSEAU = "Europe/Paris";

export interface DonneesMessage {
  prenom: string;
  tournoiNom: string;
  adversaires: string;
  /** Instant ISO du match. */
  debutISO: string;
  terrain: string | null;
}

/** "samedi 27 septembre à 14:00", en heure murale Europe/Paris. */
export function formaterDateHeure(iso: string): string {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("fr-FR", {
    timeZone: FUSEAU,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
  const heure = new Intl.DateTimeFormat("fr-FR", {
    timeZone: FUSEAU,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
  return `${date} à ${heure}`;
}

export function construireMessage(d: DonneesMessage): { sujet: string; texte: string } {
  const quand = formaterDateHeure(d.debutISO);
  const terrain = d.terrain ? ` sur ${d.terrain}` : "";
  return {
    sujet: `Rappel : votre match ${quand} — ${d.tournoiNom}`,
    texte: `Bonjour ${d.prenom}, rappel de votre match du tournoi « ${d.tournoiNom} » : ${quand}${terrain}, contre ${d.adversaires}. Bon match !`,
  };
}
