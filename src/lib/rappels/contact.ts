// Contact d'un joueur pour un canal de rappel.

export type CanalRappel = "email" | "whatsapp";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Numéro au format international sans "+" (celui attendu par wa.me et
 * l'API WhatsApp). Un numéro français local (06…) est converti en 33….
 * Renvoie null si le numéro n'est pas exploitable.
 */
export function normaliserTelephone(brut: string | null | undefined): string | null {
  if (!brut) return null;
  let chiffres = brut.trim().replace(/[\s.\-()]/g, "");
  if (chiffres.startsWith("+")) chiffres = chiffres.slice(1);
  else if (chiffres.startsWith("00")) chiffres = chiffres.slice(2);
  else if (/^0\d{9}$/.test(chiffres)) chiffres = `33${chiffres.slice(1)}`;
  if (!/^\d{8,15}$/.test(chiffres)) return null;
  return chiffres;
}

export function emailValide(brut: string | null | undefined): string | null {
  const e = brut?.trim();
  return e && EMAIL.test(e) ? e : null;
}

export function contactPourCanal(
  joueur: { email: string | null; telephone: string | null },
  canal: CanalRappel,
): string | null {
  return canal === "email" ? emailValide(joueur.email) : normaliserTelephone(joueur.telephone);
}

export function lienWhatsApp(telephone: string, texte: string): string {
  return `https://wa.me/${telephone}?text=${encodeURIComponent(texte)}`;
}
