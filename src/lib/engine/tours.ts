// §4.4 étape 1 — Génération des tours par l'algorithme du cercle (table de
// Berger). Poule de 4 => 3 tours / 6 matchs. Poule de 5 => 5 tours /
// 10 matchs avec un exempt par tour. Chaque équipe joue au plus une fois
// par tour.

export interface Tour {
  numero: number;
  rencontres: [string, string][];
  exempt: string | null;
}

export function genererTours(equipeIds: string[]): Tour[] {
  if (equipeIds.length < 2) {
    throw new Error("Il faut au moins 2 équipes pour générer des tours.");
  }

  const impair = equipeIds.length % 2 !== 0;
  const ids: (string | null)[] = impair ? [...equipeIds, null] : [...equipeIds];
  const n = ids.length;
  const nbTours = n - 1;

  let roue = [...ids];
  const tours: Tour[] = [];

  for (let t = 0; t < nbTours; t++) {
    const rencontres: [string, string][] = [];
    let exempt: string | null = null;

    for (let i = 0; i < n / 2; i++) {
      const a = roue[i];
      const b = roue[n - 1 - i];
      if (a === null) exempt = b;
      else if (b === null) exempt = a;
      else rencontres.push([a, b]);
    }

    tours.push({ numero: t + 1, rencontres, exempt });

    const fixe = roue[0];
    const reste = roue.slice(1);
    reste.unshift(reste.pop()!);
    roue = [fixe, ...reste];
  }

  return tours;
}
