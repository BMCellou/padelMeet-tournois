// Registre des formats d'animation. Les écrans et les routes demandent un format
// ici et ne connaissent jamais un format en particulier.

import { americano } from "./americano";
import { poulesNiveaux } from "./poulesNiveaux";
import { poulesTableau } from "./poulesTableau";
import type { CodeFormat, FormatAnimation } from "./types";

export type * from "./types";

const FORMATS: Record<CodeFormat, FormatAnimation> = {
  poules_tableau: poulesTableau,
  americano,
  poules_niveaux: poulesNiveaux,
};

/** Format de tout tournoi dont la colonne format_animation vaut sa valeur par défaut en base. */
export const CODE_FORMAT_PAR_DEFAUT: CodeFormat = "poules_tableau";

export function estCodeFormat(code: string): code is CodeFormat {
  return Object.prototype.hasOwnProperty.call(FORMATS, code);
}

export function getFormat(code: string): FormatAnimation {
  if (!estCodeFormat(code)) throw new Error(`Format d'animation inconnu : « ${code} ».`);
  return FORMATS[code];
}

export function listerFormats(): FormatAnimation[] {
  return Object.values(FORMATS);
}
