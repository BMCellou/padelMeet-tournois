// Données de l'écran de déroulé d'un format à manches : regroupement par tour, joueurs exemptés,
// tour à afficher à l'ouverture. Pur : l'écran et ses tests partagent le même calcul.

export interface MancheBrute {
  id: string;
  tour: number;
  statut: string;
  terrainId: string | null;
  debut: string | null;
  teamAId: string | null;
  teamBId: string | null;
  winnerId: string | null;
  /** Points saisis (un seul « set » : les jeux sont les points), null tant qu'aucun score n'est enregistré. */
  pointsA: number | null;
  pointsB: number | null;
}

export interface EquipeBrute {
  id: string;
  /** « Prénom Nom / Prénom Nom ». */
  nomAffiche: string;
  joueurIds: string[];
}

export interface MancheAffichee {
  id: string;
  statut: string;
  terrain: string;
  terrainOrdre: number;
  debut: string | null;
  equipeA: string[];
  equipeB: string[];
  pointsA: number | null;
  pointsB: number | null;
  termine: boolean;
  /** « a », « b » ou null (nul, ou pas encore joué). */
  vainqueur: "a" | "b" | null;
}

export interface TourAffiche {
  numero: number;
  manches: MancheAffichee[];
  exemptes: string[];
  termine: boolean;
}

export interface Deroule {
  tours: TourAffiche[];
  /** Premier tour qui a encore une manche à valider ; le dernier tour quand tout est validé. */
  tourCourant: number;
}

/** « Jean-Paul Martin » → « Jean-Paul M. » (le prénom est le premier mot). */
export function nomCourt(nomComplet: string): string {
  const mots = nomComplet.trim().split(/\s+/);
  if (mots.length < 2) return nomComplet.trim();
  return `${mots[0]} ${mots.slice(1).join(" ").charAt(0).toUpperCase()}.`;
}

export function joueursDeLEquipe(nomAffiche: string): string[] {
  return nomAffiche.split(" / ").map(nomCourt);
}

export function estMancheTerminee(statut: string): boolean {
  return statut === "valide" || statut === "forfait";
}

export function construireDeroule(d: {
  manches: MancheBrute[];
  equipes: Map<string, EquipeBrute>;
  /** Tous les joueurs du tournoi : ceux qui ne jouent pas un tour y sont exemptés. */
  joueurs: { id: string; nomAffiche: string }[];
  terrains: Map<string, { nom: string; ordre: number }>;
}): Deroule {
  const numeros = [...new Set(d.manches.map((m) => m.tour))].sort((a, b) => a - b);

  const tours: TourAffiche[] = numeros.map((numero) => {
    const duTour = d.manches.filter((m) => m.tour === numero);
    const jouent = new Set<string>();
    const manches: MancheAffichee[] = duTour.map((m) => {
      const a = m.teamAId ? d.equipes.get(m.teamAId) : undefined;
      const b = m.teamBId ? d.equipes.get(m.teamBId) : undefined;
      for (const id of [...(a?.joueurIds ?? []), ...(b?.joueurIds ?? [])]) jouent.add(id);
      const terrain = m.terrainId ? d.terrains.get(m.terrainId) : undefined;
      return {
        id: m.id,
        statut: m.statut,
        terrain: terrain?.nom ?? "Terrain",
        terrainOrdre: terrain?.ordre ?? 0,
        debut: m.debut,
        equipeA: a ? joueursDeLEquipe(a.nomAffiche) : ["?", "?"],
        equipeB: b ? joueursDeLEquipe(b.nomAffiche) : ["?", "?"],
        pointsA: m.pointsA,
        pointsB: m.pointsB,
        termine: estMancheTerminee(m.statut),
        vainqueur: m.winnerId && m.winnerId === m.teamAId ? "a" : m.winnerId && m.winnerId === m.teamBId ? "b" : null,
      };
    });
    manches.sort((x, y) => x.terrainOrdre - y.terrainOrdre);
    return {
      numero,
      manches,
      exemptes: d.joueurs.filter((j) => !jouent.has(j.id)).map((j) => nomCourt(j.nomAffiche)),
      termine: manches.every((m) => m.termine),
    };
  });

  const courant = tours.find((t) => !t.termine) ?? tours[tours.length - 1];
  return { tours, tourCourant: courant?.numero ?? 1 };
}
