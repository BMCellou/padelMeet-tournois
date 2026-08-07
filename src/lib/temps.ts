// Le club et ses joueurs sont en France : toute heure de match affichée ou
// saisie est censée être une heure murale Europe/Paris, quel que soit le
// fuseau horaire de la machine qui exécute le code (serveur ou navigateur).
// On ne se fie donc jamais au fuseau ambiant (`Date#getHours`) : on passe
// systématiquement par `Intl` avec un fuseau explicite.

const FUSEAU = "Europe/Paris";

function decalageMinutes(instant: Date, fuseau: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: fuseau,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .formatToParts(instant)
    .reduce<Record<string, string>>((acc, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
      return acc;
    }, {});

  const commeUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  );

  return (commeUTC - instant.getTime()) / 60_000;
}

/** Formate un instant ISO en heure murale Europe/Paris ("HH:mm"). */
export function formatHeureParis(iso: string | null): string | null {
  if (!iso) return null;
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: FUSEAU,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

/**
 * Convertit une date + heure murale Europe/Paris (ex. "2026-08-08", "14:00")
 * en instant UTC ISO, indépendamment du fuseau de la machine qui exécute
 * ce code.
 */
export function heureLocaleVersISO(dateISO: string, heureHHmm: string): string {
  const approx = new Date(`${dateISO}T${heureHHmm}:00Z`);
  const decalage = decalageMinutes(approx, FUSEAU);
  return new Date(approx.getTime() - decalage * 60_000).toISOString();
}
