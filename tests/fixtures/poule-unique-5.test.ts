// Scénario de référence (CLAUDE.md) : 5 équipes, poule unique, 2 terrains,
// 5 tours avec un exempt par tour, classement final = classement de
// poule (pas de tableau). Toute modification du moteur doit garder ce
// test au vert.

import { describe, expect, it } from "vitest";
import { calculerRepartitionPoules } from "@/lib/engine/poules";
import { genererTours } from "@/lib/engine/tours";
import { planifier, type Court } from "@/lib/engine/planification";
import { calculerClassement, type MatchTermine, type CritereDepartage } from "@/lib/engine/classement";

const CRITERES: CritereDepartage[] = [
  "victoires",
  "confrontation_directe",
  "mini_classement",
  "ratio_sets",
  "ratio_jeux",
];

const EQUIPES = ["equipe1", "equipe2", "equipe3", "equipe4", "equipe5"];

function numeroDe(teamId: string): number {
  return Number(teamId.replace("equipe", ""));
}

function simulerMatch(teamAId: string, teamBId: string): MatchTermine {
  const aGagne = numeroDe(teamAId) < numeroDe(teamBId);
  const gap = Math.abs(numeroDe(teamAId) - numeroDe(teamBId));
  const jeuxPerdant = Math.max(0, 5 - gap);
  return {
    teamAId,
    teamBId,
    vainqueurId: aGagne ? teamAId : teamBId,
    setsA: aGagne ? 1 : 0,
    setsB: aGagne ? 0 : 1,
    jeuxA: aGagne ? 7 : jeuxPerdant,
    jeuxB: aGagne ? jeuxPerdant : 7,
  };
}

describe("poule unique de 5 équipes, 2 terrains", () => {
  it("une seule poule est la seule option respectant le minimum de 4", () => {
    const repartition = calculerRepartitionPoules(5);
    expect(repartition.nombrePoules).toBe(1);
    expect(repartition.tailles).toEqual([5]);
  });

  const tours = genererTours(EQUIPES);

  it("génère 5 tours de 10 matchs au total, avec un exempt par tour", () => {
    expect(tours).toHaveLength(5);
    const totalMatchs = tours.reduce((s, t) => s + t.rencontres.length, 0);
    expect(totalMatchs).toBe(10);
    expect(tours.every((t) => t.exempt !== null)).toBe(true);
    // Chaque équipe est exemptée exactement une fois sur les 5 tours.
    expect([...tours.map((t) => t.exempt)].sort()).toEqual([...EQUIPES].sort());
  });

  const courts: Court[] = [
    { id: "court1", ordre: 1 },
    { id: "court2", ordre: 2 },
  ];

  const matchsAPlanifier = tours.flatMap((t, i) =>
    t.rencontres.map(([a, b], j) => ({
      id: `t${i}-m${j}`,
      groupId: "unique",
      round: t.numero,
      teamAId: a,
      teamBId: b,
    })),
  );

  const planning = planifier(matchsAPlanifier, courts, {
    heureDebut: "2026-07-25T09:00:00.000Z",
    dureeJeuMin: 25,
    rotationMin: 5,
    reposMinMin: 15,
  });

  it("place les 10 matchs sur 2 terrains sans conflit d'équipe", () => {
    expect(planning).toHaveLength(10);

    const finParEquipe = new Map<string, number>();
    for (const m of matchsAPlanifier) {
      const p = planning.find((pl) => pl.matchId === m.id)!;
      const debut = new Date(p.debut).getTime();
      for (const teamId of [m.teamAId, m.teamBId]) {
        const finPrecedente = finParEquipe.get(teamId);
        if (finPrecedente !== undefined) {
          expect(debut).toBeGreaterThanOrEqual(finPrecedente);
        }
      }
      const fin = new Date(p.fin).getTime();
      finParEquipe.set(m.teamAId, fin);
      finParEquipe.set(m.teamBId, fin);
    }
  });

  const matches = tours.flatMap((t) => t.rencontres.map(([a, b]) => simulerMatch(a, b)));
  const classement = calculerClassement(matches, EQUIPES, CRITERES);

  it("le classement de poule EST le classement final (pas de tableau)", () => {
    // equipe1 bat tout le monde, equipe5 perd tout : hiérarchie propre.
    expect(classement.find((e) => e.teamId === "equipe1")!.rang).toBe(1);
    expect(classement.find((e) => e.teamId === "equipe5")!.rang).toBe(5);
    expect(classement).toHaveLength(5);
    // Chaque équipe a joué 4 matchs (round-robin complet à 5).
    expect(classement.every((e) => e.joues === 4)).toBe(true);
  });
});
