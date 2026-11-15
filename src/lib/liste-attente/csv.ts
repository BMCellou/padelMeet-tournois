// CSV lisible par Excel (séparateur « ; », guillemets doublés) — pur.
// Une cellule qui commence par = + - @ est neutralisée : les noms viennent d'un formulaire public, et Excel
// exécuterait sinon une formule glissée dans un champ (injection CSV).

function cellule(valeur: string): string {
  const neutralisee = /^[=+\-@\t\r]/.test(valeur) ? `'${valeur}` : valeur;
  return `"${neutralisee.replaceAll('"', '""')}"`;
}

export function versCsv(entetes: string[], lignes: string[][]): string {
  return [entetes, ...lignes].map((l) => l.map(cellule).join(";")).join("\r\n");
}
