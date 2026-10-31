import { describe, expect, it } from "vitest";
import { getFormat } from "./index";
import type { EtatTournoi, GroupeEtat, MatchEtat, MatchPrevu } from "./types";

const format = getFormat("poules_niveaux");
const terrains = [1, 2, 3].map((n) => ({ id: `t${n}`, ordre: n }));
const planification = { heureDebut: "2027-01-16T13:00:00.000Z", dureeJeuMin: 15, rotationMin: 5, reposMinMin: 5 };

function equipes(n: number) {
  return Array.from({ length: n }, (_, i) => ({ id: `e${String(i + 1).padStart(2, "0")}`, seed: null }));
}

/** Joue un match : l'équipe au plus petit numéro gagne (résultat déterministe). */
function jouer(m: MatchPrevu): MatchEtat {
  const [a, b] = [m.teamAId!, m.teamBId!];
  const gagnant = a < b ? a : b;
  return {
    id: m.id,
    phase: m.phase,
    groupeId: m.groupeId,
    tour: m.tour,
    teamAId: a,
    teamBId: b,
    termine: true,
    vainqueurId: gagnant,
    resultat: { teamAId: a, teamBId: b, vainqueurId: gagnant, setsA: gagnant === a ? 1 : 0, setsB: gagnant === b ? 1 : 0, jeuxA: gagnant === a ? 6 : 3, jeuxB: gagnant === b ? 6 : 3 },
    placement: m.placement,
  };
}

function premierTour(n: number, options: Partial<EtatTournoi> = {}) {
  const base: EtatTournoi = { participants: equipes(n), terrains, config: {}, graine: 42, planification, matchs: [], ...options };
  const tours = format.genererTours(base);
  const groupes: GroupeEtat[] = options.groupes ?? [];
  return { base, tours, matchs: tours.flatMap((t) => t.matchs), groupes };
}

/** Tire les poules puis joue tout le premier tour. */
function jusquAuSecondTour(n: number, options: { nombreGroupesForce?: number } = {}) {
  const repartition = format.groupes!.repartir(n, options);
  const tirage = format.groupes!.tirer(equipes(n), repartition.tailles, 42);
  const groupes: GroupeEtat[] = tirage.poules.map((p) => ({ id: `poule-${p.nom}`, nom: p.nom, participantIds: p.equipeIds }));
  const { base, matchs } = premierTour(n, { groupes, config: { nombreGroupesForce: options.nombreGroupesForce } });
  const joues = matchs.map(jouer);
  const etat: EtatTournoi = { ...base, groupes, matchs: joues };
  return { etat, groupes, matchs };
}

describe("format poules de niveau : identité", () => {
  it("n'a ni tableau final ni rotation, mais un second tour par niveaux", () => {
    expect(format.aUnTableauFinal).toBe(false);
    expect(format.phaseFinale).toBeUndefined();
    expect(format.rotation).toBeUndefined();
    expect(format.niveaux).toBeDefined();
    expect(format.uniteClassement).toBe("equipe");
    expect(format.calendrier).toBe("dynamique");
  });

  it("valide l'effectif : 4 équipes minimum, avertit d'une poule unique", () => {
    expect(format.validerEffectif(3, 3).ok).toBe(false);
    expect(format.validerEffectif(9, 3)).toEqual({ ok: true });
    expect(format.validerEffectif(5, 3).avertissement).toMatch(/Une seule poule/);
  });
});

describe("9 équipes sur 3 terrains : 3 poules de 3 puis 3 niveaux de 3", () => {
  const { etat, matchs: matchsPremier } = jusquAuSecondTour(9);

  it("premier tour : 9 matchs, 3 poules de 3, chaque équipe joue 2 fois", () => {
    expect(matchsPremier).toHaveLength(9);
    const parEquipe = new Map<string, number>();
    for (const m of matchsPremier) for (const id of [m.teamAId!, m.teamBId!]) parEquipe.set(id, (parEquipe.get(id) ?? 0) + 1);
    expect([...parEquipe.values()]).toEqual(Array(9).fill(2));
  });

  it("le second tour n'existe pas tant que le premier n'est pas fini", () => {
    const incomplet: EtatTournoi = { ...etat, matchs: etat.matchs.map((m, i) => (i === 0 ? { ...m, termine: false, resultat: undefined } : m)) };
    expect(format.tourSuivant(incomplet)).toBeNull();
  });

  const suivant = format.tourSuivant(etat)!;

  it("crée 3 niveaux (1ers, 2es, 3es), 9 matchs de plus : 18 en tout, 4 matchs par équipe", () => {
    expect(suivant.groupes!.map((g) => [g.nom, g.niveau, g.participantIds.length])).toEqual([
      ["Niveau 1", 1, 3],
      ["Niveau 2", 2, 3],
      ["Niveau 3", 3, 3],
    ]);
    expect(suivant.matchs).toHaveLength(9);
    const parEquipe = new Map<string, number>();
    for (const m of [...matchsPremier, ...suivant.matchs]) for (const id of [m.teamAId!, m.teamBId!]) parEquipe.set(id, (parEquipe.get(id) ?? 0) + 1);
    expect([...parEquipe.values()]).toEqual(Array(9).fill(4));
  });

  it("aucune revanche : on ne rejoue jamais un adversaire déjà rencontré", () => {
    const deja = new Set(matchsPremier.map((m) => [m.teamAId, m.teamBId].sort().join("|")));
    for (const m of suivant.matchs) expect(deja.has([m.teamAId, m.teamBId].sort().join("|"))).toBe(false);
  });

  it("chaque niveau réunit une équipe de chaque poule, le niveau 1 les premiers de poule", () => {
    const pouleDe = (id: string) => etat.groupes!.find((g) => g.participantIds.includes(id))!.id;
    for (const g of suivant.groupes!) expect(new Set(g.participantIds.map(pouleDe)).size).toBe(3);
    // Les équipes de plus petit numéro gagnent : le 1er de chaque poule est son équipe de plus petit numéro.
    for (const id of suivant.groupes![0].participantIds) {
      const poule = etat.groupes!.find((g) => g.participantIds.includes(id))!;
      expect(id).toBe([...poule.participantIds].sort()[0]);
    }
  });

  it("le second tour est placé après le premier, avec le repos du tournoi, sur les 3 terrains", () => {
    const finPremier = Math.max(...matchsPremier.map((m) => new Date(m.placement!.fin).getTime()));
    for (const m of suivant.matchs) {
      expect(new Date(m.placement!.debut).getTime()).toBeGreaterThanOrEqual(finPremier + 5 * 60_000);
      expect(terrains.map((t) => t.id)).toContain(m.placement!.terrainId);
    }
    const creneaux = new Set(suivant.matchs.map((m) => m.placement!.debut));
    expect(creneaux.size).toBe(3);
  });

  it("l'ensemble tient dans 3 heures : fin avant 16 h pour un début à 13 h", () => {
    const fin = Math.max(...suivant.matchs.map((m) => new Date(m.placement!.fin).getTime()));
    expect((fin - new Date(planification.heureDebut).getTime()) / 60_000).toBeLessThanOrEqual(180);
  });

  it("numérote les tours à la suite du premier", () => {
    const dernierPremier = Math.max(...matchsPremier.map((m) => m.tour));
    expect(suivant.numero).toBe(dernierPremier + 1);
    expect(Math.min(...suivant.matchs.map((m) => m.tour))).toBe(dernierPremier + 1);
  });

  it("ne génère rien une deuxième fois", () => {
    const groupes = [...etat.groupes!, ...suivant.groupes!];
    expect(format.tourSuivant({ ...etat, groupes })).toBeNull();
  });
});

describe("effectifs irréguliers", () => {
  it("10 équipes (4, 3, 3) : le niveau 4 n'a qu'une équipe et ne joue pas ; chacun joue 3 matchs ou plus", () => {
    const { etat, matchs } = jusquAuSecondTour(10);
    const suivant = format.tourSuivant(etat)!;
    expect(suivant.groupes!.map((g) => g.participantIds.length)).toEqual([3, 3, 3]);
    const parEquipe = new Map<string, number>();
    for (const m of [...matchs, ...suivant.matchs]) for (const id of [m.teamAId!, m.teamBId!]) parEquipe.set(id, (parEquipe.get(id) ?? 0) + 1);
    expect(parEquipe.size).toBe(10);
    expect(Math.min(...parEquipe.values())).toBeGreaterThanOrEqual(3);
  });

  it("11 équipes (4, 4, 3) : le niveau 4 est un match de classement entre deux équipes", () => {
    const { etat } = jusquAuSecondTour(11);
    const suivant = format.tourSuivant(etat)!;
    const dernier = suivant.groupes!.at(-1)!;
    expect(dernier.participantIds).toHaveLength(2);
    expect(suivant.matchs.filter((m) => m.groupeId === dernier.id)).toHaveLength(1);
  });

  it("poule unique (5 équipes) : pas de second tour, et le tournoi est terminé quand la poule l'est", () => {
    const { etat } = jusquAuSecondTour(5);
    expect(format.tourSuivant(etat)).toBeNull();
    expect(format.estTermine(etat)).toBe(true);
  });

  it("l'organisateur peut imposer 2 poules pour 12 équipes : niveaux de 2 équipes (matchs de classement)", () => {
    const { etat } = jusquAuSecondTour(12, { nombreGroupesForce: 2 });
    const suivant = format.tourSuivant(etat)!;
    expect(suivant.groupes!).toHaveLength(6);
    expect(suivant.groupes!.every((g) => g.participantIds.length === 2)).toBe(true);
    expect(suivant.matchs).toHaveLength(6);
  });
});

describe("fin de tournoi et classement", () => {
  it("n'est terminé qu'une fois les matchs des niveaux joués", () => {
    const { etat } = jusquAuSecondTour(9);
    const suivant = format.tourSuivant(etat)!;
    const groupes = [...etat.groupes!, ...suivant.groupes!];
    expect(format.estTermine({ ...etat, groupes })).toBe(false); // niveaux créés, pas joués
    const avecNiveauxEnCours: EtatTournoi = { ...etat, groupes, matchs: [...etat.matchs, ...suivant.matchs.map((m) => ({ ...jouer(m), termine: false, resultat: undefined }))] };
    expect(format.estTermine(avecNiveauxEnCours)).toBe(false);
    const toutJoue: EtatTournoi = { ...etat, groupes, matchs: [...etat.matchs, ...suivant.matchs.map(jouer)] };
    expect(format.estTermine(toutJoue)).toBe(true);
  });

  it("classe chaque groupe (poules et niveaux) et donne un classement final de 1 à 9 sans trou", () => {
    const { etat } = jusquAuSecondTour(9);
    const suivant = format.tourSuivant(etat)!;
    const groupes = [...etat.groupes!, ...suivant.groupes!];
    const toutJoue: EtatTournoi = { ...etat, groupes, matchs: [...etat.matchs, ...suivant.matchs.map(jouer)] };

    const lignes = format.classement(toutJoue);
    const parGroupe = Map.groupBy(lignes, (l) => l.groupeId);
    expect(parGroupe.size).toBe(6);

    const final = format.niveaux!.classementFinal(
      suivant.groupes!.map((g) => ({
        niveau: g.niveau!,
        equipes: lignes.filter((l) => l.groupeId === g.id).map((l) => ({ teamId: l.participantId, rang: l.rang })),
      })),
    );
    expect(final.map((l) => l.rang).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(final[0].niveau).toBe(1);
    // Le vainqueur est l'équipe de plus petit numéro (elle gagne tous ses matchs).
    expect(final.find((l) => l.rang === 1)!.equipeId).toBe("e01");
  });
});

// ── Variante avec phase finale ──────────────────────────────────────────

describe("poules de niveau + phase finale : 9 équipes, 4 qualifiés, 3 terrains", () => {
  const avecFinale = getFormat("poules_niveaux_finale");

  function premierTourJoue(n: number, nbQualifies: number) {
    const repartition = avecFinale.groupes!.repartir(n);
    const tirage = avecFinale.groupes!.tirer(equipes(n), repartition.tailles, 42);
    const groupes: GroupeEtat[] = tirage.poules.map((p) => ({ id: `poule-${p.nom}`, nom: p.nom, participantIds: p.equipeIds }));
    const base: EtatTournoi = { participants: equipes(n), terrains, config: { nbQualifies }, graine: 42, planification, groupes, matchs: [] };
    const matchs = avecFinale.genererTours(base).flatMap((t) => t.matchs);
    return { etat: { ...base, matchs: matchs.map(jouer) } as EtatTournoi, matchs, groupes };
  }

  const { etat, matchs: matchsPremier } = premierTourJoue(9, 4);

  it("déclare un tableau final et un second tour par niveaux, sans rotation", () => {
    expect(avecFinale.aUnTableauFinal).toBe(true);
    expect(avecFinale.phaseFinale).toBeDefined();
    expect(avecFinale.niveaux).toBeDefined();
    expect(avecFinale.rotation).toBeUndefined();
    expect(avecFinale.phases.map((p) => p.code)).toContain("demis");
  });

  const suivant = avecFinale.tourSuivant(etat)!;
  const bracket = suivant.matchs.filter((m) => m.phase === "finale" || m.phase === "classement");
  const matchsNiveaux = suivant.matchs.filter((m) => m.phase === "groupe");

  it("tableau de 4 (2 demies, finale, 3e place) + niveaux de classement pour les 5 autres", () => {
    expect(bracket).toHaveLength(4);
    // 3 premiers + meilleur 2e qualifiés : restent deux 2es (un match de classement) et trois 3es (une tournante).
    expect(suivant.groupes!.map((g) => [g.nom, g.participantIds.length])).toEqual([
      ["Niveau 2", 2],
      ["Niveau 3", 3],
    ]);
    expect(matchsNiveaux).toHaveLength(1 + 3);
  });

  it("aucune équipe qualifiée ne rejoue dans un niveau, et chaque équipe joue au moins 3 matchs", () => {
    const qualifies = new Set(bracket.flatMap((m) => [m.teamAId, m.teamBId]).filter((id): id is string => !!id));
    expect(qualifies.size).toBe(4);
    for (const g of suivant.groupes!) for (const id of g.participantIds) expect(qualifies.has(id)).toBe(false);

    const parEquipe = new Map<string, number>();
    const compter = (id: string | null) => id && parEquipe.set(id, (parEquipe.get(id) ?? 0) + 1);
    for (const m of [...matchsPremier, ...matchsNiveaux]) { compter(m.teamAId); compter(m.teamBId); }
    for (const id of qualifies) parEquipe.set(id, (parEquipe.get(id) ?? 0) + 2); // demi-finale + finale ou 3e place
    expect(parEquipe.size).toBe(9);
    expect(Math.min(...parEquipe.values())).toBeGreaterThanOrEqual(3);
  });

  it("aucune revanche dans les niveaux", () => {
    const deja = new Set(matchsPremier.map((m) => [m.teamAId, m.teamBId].sort().join("|")));
    for (const m of matchsNiveaux) expect(deja.has([m.teamAId, m.teamBId].sort().join("|"))).toBe(false);
  });

  it("tableau et niveaux sont placés ensemble après le premier tour, sans conflit de terrain", () => {
    const finPremier = Math.max(...matchsPremier.map((m) => new Date(m.placement!.fin).getTime()));
    const tous = suivant.matchs;
    expect(tous.every((m) => m.placement)).toBe(true);
    for (const m of tous) expect(new Date(m.placement!.debut).getTime()).toBeGreaterThanOrEqual(finPremier + 5 * 60_000);
    const cles = tous.map((m) => `${m.placement!.terrainId}@${m.placement!.debut}`);
    expect(new Set(cles).size).toBe(cles.length);
  });

  it("l'ensemble de la journée tient dans 3 heures (début à 13 h)", () => {
    const fin = Math.max(...suivant.matchs.map((m) => new Date(m.placement!.fin).getTime()));
    expect((fin - new Date(planification.heureDebut).getTime()) / 60_000).toBeLessThanOrEqual(180);
  });

  it("ne régénère rien une seconde fois, ni sans nombre de qualifiés", () => {
    expect(avecFinale.tourSuivant({ ...etat, groupes: [...etat.groupes!, ...suivant.groupes!] })).toBeNull();
    expect(avecFinale.tourSuivant({ ...etat, matchs: [...etat.matchs, jouerFinale(bracket[0])] })).toBeNull();
    expect(avecFinale.tourSuivant({ ...etat, config: {} })).toBeNull();
  });

  function jouerFinale(m: MatchPrevu): MatchEtat {
    return { id: m.id, phase: m.phase, groupeId: null, tour: m.tour, teamAId: m.teamAId, teamBId: m.teamBId, termine: false, vainqueurId: null };
  }

  it("classement final : les qualifiés d'abord (places 1 à 4), puis les niveaux", () => {
    const final = avecFinale.niveaux!.classementFinal(
      [
        { niveau: 2, equipes: [{ teamId: "x", rang: 1 }, { teamId: "y", rang: 2 }] },
        { niveau: 3, equipes: [{ teamId: "a", rang: 1 }, { teamId: "b", rang: 2 }, { teamId: "c", rang: 3 }] },
      ],
      4,
    );
    expect(final.map((l) => [l.rang, l.equipeId])).toEqual([[5, "x"], [6, "y"], [7, "a"], [8, "b"], [9, "c"]]);
  });

  it("à 12 équipes (4 poules de 3, 8 qualifiés), les niveaux de classement sont des matchs entre non-qualifiés", () => {
    const { etat: e12 } = premierTourJoue(12, 8);
    const s = avecFinale.tourSuivant(e12)!;
    expect(s.matchs.filter((m) => m.phase === "finale").length).toBeGreaterThan(0);
    const qualifies = new Set(s.matchs.filter((m) => m.phase === "finale").flatMap((m) => [m.teamAId, m.teamBId]).filter(Boolean));
    expect(qualifies.size).toBe(8);
    for (const g of s.groupes!) for (const id of g.participantIds) expect(qualifies.has(id)).toBe(false);
  });
});
