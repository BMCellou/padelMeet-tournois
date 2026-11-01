// Palette de marque des documents PDF : les mêmes valeurs que src/app/globals.css
// (Navy/Ink pour la marque et le texte, Volt en accent, jamais en grand aplat,
// Paper/Mist pour les fonds). Un test vérifie la parité avec la feuille de style.
// Les contrastes restent lisibles imprimés en niveaux de gris : le volt n'est
// posé que sur le marine, ou en petit liseré.

import { rgb, type Color } from "pdf-lib";

export type Couleur = Color;

export const HEX = {
  encre: "#0b2233",
  marine: "#112434",
  volt: "#defe17",
  papier: "#f6f7f9",
  brume: "#e5e7eb",
  texteDiscret: "#5b6b76",
  trait: "#8b98a1",
  traitClair: "#b7c0c6",
  blanc: "#ffffff",
  /** Teinte du volt allégée (fond d'une ligne mise en avant), assez claire pour rester lisible. */
  voltPale: "#f3fdb4",
} as const;

function depuisHex(hex: string): Couleur {
  const n = Number.parseInt(hex.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

export const COULEURS = {
  encre: depuisHex(HEX.encre),
  marine: depuisHex(HEX.marine),
  volt: depuisHex(HEX.volt),
  papier: depuisHex(HEX.papier),
  brume: depuisHex(HEX.brume),
  texteDiscret: depuisHex(HEX.texteDiscret),
  trait: depuisHex(HEX.trait),
  traitClair: depuisHex(HEX.traitClair),
  blanc: depuisHex(HEX.blanc),
  voltPale: depuisHex(HEX.voltPale),
} as const;

/**
 * Teinte entre l'encre (0) et le blanc (1) : conserve l'échelle de « gris » utilisée
 * par les appels de dessin (0 = texte plein, 0.4 = discret, 1 = blanc).
 */
export function teinte(niveau: number): Couleur {
  const n = Math.min(1, Math.max(0, niveau));
  const encre = [0x0b, 0x22, 0x33];
  const [r, g, b] = encre.map((c) => (c + (255 - c) * n) / 255);
  return rgb(r, g, b);
}
