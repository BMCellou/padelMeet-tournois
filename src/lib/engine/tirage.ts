// §4.3 — Tirage au sort des poules. Têtes de série réparties une par
// poule (serpentin), puis le reste tiré au sort. Reproductible : la
// graine est fournie par l'appelant et doit être stockée pour rejouer le
// tirage à l'identique en cas de contestation.

import { melanger } from "./rng";

export interface EquipeAvecSeed {
  id: string;
  /** 1 = tête de série n°1, etc. Absent/null = pas de tête de série. */
  seed?: number | null;
}

export interface Poule {
  nom: string;
  equipeIds: string[];
}

export interface TirageResult {
  poules: Poule[];
}

function nomPoule(index: number): string {
  return String.fromCharCode("A".charCodeAt(0) + index);
}

export function tirerAuSort(
  equipes: EquipeAvecSeed[],
  tailles: number[],
  rng: () => number,
): TirageResult {
  const total = tailles.reduce((s, t) => s + t, 0);
  if (equipes.length !== total) {
    throw new Error(
      `${equipes.length} équipe(s) fournie(s) mais les tailles de poules somment à ${total}.`,
    );
  }

  const nombrePoules = tailles.length;
  const noms = Array.from({ length: nombrePoules }, (_, i) => nomPoule(i));
  const poules: Poule[] = noms.map((nom) => ({ nom, equipeIds: [] }));

  const tetesDeSerieTriees = equipes
    .filter((e) => e.seed != null)
    .sort((a, b) => a.seed! - b.seed!);
  const nonSeedees = equipes.filter((e) => e.seed == null);

  // Distribution en serpentin des têtes de série : A-B-C puis C-B-A...
  let indexPoule = 0;
  let direction = 1;
  for (const equipe of tetesDeSerieTriees) {
    // Cherche la prochaine poule non pleine en respectant le sens du serpentin.
    let tentatives = 0;
    while (poules[indexPoule].equipeIds.length >= tailles[indexPoule] && tentatives < nombrePoules) {
      indexPoule += direction;
      if (indexPoule >= nombrePoules) {
        indexPoule = nombrePoules - 1;
        direction = -1;
      } else if (indexPoule < 0) {
        indexPoule = 0;
        direction = 1;
      }
      tentatives++;
    }
    poules[indexPoule].equipeIds.push(equipe.id);

    indexPoule += direction;
    if (indexPoule >= nombrePoules) {
      indexPoule = nombrePoules - 1;
      direction = -1;
    } else if (indexPoule < 0) {
      indexPoule = 0;
      direction = 1;
    }
  }

  // Le reste : tirage intégral au sort, distribué poule par poule jusqu'à
  // atteinte de la taille cible.
  const restants = melanger(nonSeedees, rng);
  let curseur = 0;
  for (const equipe of restants) {
    while (poules[curseur % nombrePoules].equipeIds.length >= tailles[curseur % nombrePoules]) {
      curseur++;
    }
    poules[curseur % nombrePoules].equipeIds.push(equipe.id);
    curseur++;
  }

  return { poules };
}
