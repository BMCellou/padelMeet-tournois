// §4.2 — Appariement des joueurs seuls. Trois stratégies. Un joueur qui
// reste sans partenaire est signalé à l'admin, jamais supprimé.

import { melanger } from "./rng";

export interface JoueurSolo {
  id: string;
  sexe?: "H" | "F";
  /** Plus petit = meilleur niveau. Requis pour la stratégie "equilibre". */
  niveau?: number;
}

export type StrategieAppariement = "aleatoire" | "equilibre" | "mixte";

export interface ResultatAppariement {
  equipes: [string, string][];
  joueursNonApparies: string[];
}

function apparierAleatoire(joueurs: JoueurSolo[], rng: () => number): ResultatAppariement {
  const melanges = melanger(joueurs, rng);
  const equipes: [string, string][] = [];
  for (let i = 0; i + 1 < melanges.length; i += 2) {
    equipes.push([melanges[i].id, melanges[i + 1].id]);
  }
  const joueursNonApparies = melanges.length % 2 === 1 ? [melanges[melanges.length - 1].id] : [];
  return { equipes, joueursNonApparies };
}

function apparierEquilibre(joueurs: JoueurSolo[]): ResultatAppariement {
  for (const j of joueurs) {
    if (j.niveau === undefined) {
      throw new Error(
        `Stratégie "equilibre" : niveau manquant pour le joueur ${j.id}.`,
      );
    }
  }
  const tries = [...joueurs].sort((a, b) => a.niveau! - b.niveau!);
  const equipes: [string, string][] = [];
  let gauche = 0;
  let droite = tries.length - 1;
  while (gauche < droite) {
    equipes.push([tries[gauche].id, tries[droite].id]);
    gauche++;
    droite--;
  }
  const joueursNonApparies = gauche === droite ? [tries[gauche].id] : [];
  return { equipes, joueursNonApparies };
}

function apparierMixte(joueurs: JoueurSolo[], rng: () => number): ResultatAppariement {
  for (const j of joueurs) {
    if (j.sexe === undefined) {
      throw new Error(`Stratégie "mixte" : sexe manquant pour le joueur ${j.id}.`);
    }
  }
  const hommes = melanger(
    joueurs.filter((j) => j.sexe === "H"),
    rng,
  );
  const femmes = melanger(
    joueurs.filter((j) => j.sexe === "F"),
    rng,
  );
  const nbPaires = Math.min(hommes.length, femmes.length);
  const equipes: [string, string][] = [];
  for (let i = 0; i < nbPaires; i++) {
    equipes.push([hommes[i].id, femmes[i].id]);
  }
  const joueursNonApparies = [
    ...hommes.slice(nbPaires).map((j) => j.id),
    ...femmes.slice(nbPaires).map((j) => j.id),
  ];
  return { equipes, joueursNonApparies };
}

export function apparierSolos(
  joueurs: JoueurSolo[],
  strategie: StrategieAppariement,
  rng: () => number,
): ResultatAppariement {
  switch (strategie) {
    case "aleatoire":
      return apparierAleatoire(joueurs, rng);
    case "equilibre":
      return apparierEquilibre(joueurs);
    case "mixte":
      return apparierMixte(joueurs, rng);
  }
}
