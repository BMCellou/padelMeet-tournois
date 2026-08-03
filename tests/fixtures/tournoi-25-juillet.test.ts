// Scénario de référence (CLAUDE.md) : 14 équipes, poules 5/5/4, tableau de
// 8. Fait tourner le moteur de bout en bout — tirage, tours, classement,
// qualification, tableau, propagation, classement final — et vérifie les
// invariants structurels du pipeline complet. Toute modification du moteur
// doit garder ce test au vert.

import { describe, expect, it } from "vitest";
import { calculerRepartitionPoules } from "@/lib/engine/poules";
import { tirerAuSort, type EquipeAvecSeed } from "@/lib/engine/tirage";
import { genererTours } from "@/lib/engine/tours";
import { calculerClassement, type MatchTermine, type CritereDepartage } from "@/lib/engine/classement";
import { selectionnerQualifies, type ClassementPoule } from "@/lib/engine/qualification";
import { genererTableau, type Qualifie } from "@/lib/engine/tableau";
import { propagerVainqueur } from "@/lib/engine/propagation";
import { classementFinal, cumulJeuxGagnesTournoi } from "@/lib/engine/classementFinal";
import { creerRng } from "@/lib/engine/rng";

const CRITERES: CritereDepartage[] = [
  "victoires",
  "confrontation_directe",
  "mini_classement",
  "ratio_sets",
  "ratio_jeux",
];

function numeroDe(teamId: string): number {
  return Number(teamId.replace("equipe", ""));
}

/** Résultat déterministe : le numéro le plus bas gagne, écart => score. */
function simulerMatch(teamAId: string, teamBId: string): MatchTermine {
  const na = numeroDe(teamAId);
  const nb = numeroDe(teamBId);
  const aGagne = na < nb;
  const gap = Math.abs(na - nb);
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

describe("tournoi du 25 juillet (14 équipes, poules 5/5/4, tableau de 8)", () => {
  const equipes: EquipeAvecSeed[] = Array.from({ length: 14 }, (_, i) => ({
    id: `equipe${i + 1}`,
  }));

  const repartition = calculerRepartitionPoules(14);
  it("répartit 14 équipes en poules 5/5/4", () => {
    expect(repartition.nombrePoules).toBe(3);
    expect([...repartition.tailles].sort((a, b) => b - a)).toEqual([5, 5, 4]);
  });

  const tirage = tirerAuSort(equipes, repartition.tailles, creerRng(20260725));

  it("tire au sort 3 poules aux tailles attendues", () => {
    expect(tirage.poules.map((p) => p.equipeIds.length).sort((a, b) => b - a)).toEqual([5, 5, 4]);
  });

  // Classement de chaque poule, à partir de matchs simulés (round-robin
  // complet via genererTours pour chaque poule).
  const classementsParPoule: ClassementPoule[] = tirage.poules.map((poule) => {
    const tours = genererTours(poule.equipeIds);
    const matches = tours.flatMap((t) => t.rencontres.map(([a, b]) => simulerMatch(a, b)));
    return {
      groupId: poule.nom,
      equipes: calculerClassement(matches, poule.equipeIds, CRITERES),
    };
  });

  const toutesLesMatchsDePoule: MatchTermine[] = classementsParPoule.flatMap((cp) => {
    const poule = tirage.poules.find((p) => p.nom === cp.groupId)!;
    const tours = genererTours(poule.equipeIds);
    return tours.flatMap((t) => t.rencontres.map(([a, b]) => simulerMatch(a, b)));
  });

  it("chaque poule joue le bon nombre de matchs (3 matchs mini par équipe)", () => {
    for (const poule of tirage.poules) {
      const tours = genererTours(poule.equipeIds);
      expect(tours).toHaveLength(poule.equipeIds.length - 1 + (poule.equipeIds.length % 2));
    }
  });

  const qualification = selectionnerQualifies(classementsParPoule, 8);

  it("qualifie 8 équipes pour un tableau de 8", () => {
    expect(qualification.tailleTableau).toBe(8);
    expect(qualification.qualifies).toHaveLength(8);
    expect(new Set(qualification.qualifies).size).toBe(8);
  });

  function poulDe(teamId: string): string {
    return tirage.poules.find((p) => p.equipeIds.includes(teamId))!.nom;
  }

  const qualifies: Qualifie[] = qualification.qualifies.map((teamId) => ({
    teamId,
    groupId: poulDe(teamId),
  }));

  const tableau = genererTableau(qualifies);

  it("génère un tableau de 8 (4 quarts, 2 demies, 1 finale)", () => {
    expect(tableau.filter((m) => m.round === 1)).toHaveLength(4);
    expect(tableau.filter((m) => m.round === 2)).toHaveLength(2);
    expect(tableau.filter((m) => m.round === 3)).toHaveLength(1);
  });

  it("n'oppose jamais deux équipes de la même poule au premier tour", () => {
    for (const m of tableau.filter((match) => match.round === 1)) {
      expect(poulDe(m.teamAId!)).not.toBe(poulDe(m.teamBId!));
    }
  });

  // Propagation des vainqueurs, tour par tour (le gagnant d'un match de
  // tableau est déterminé par la même règle déterministe que les poules).
  let etatTableau = tableau;
  const nbTours = Math.log2(qualification.tailleTableau);
  for (let tour = 1; tour <= nbTours; tour++) {
    for (const m of etatTableau.filter((match) => match.round === tour)) {
      const gagnant = numeroDe(m.teamAId!) < numeroDe(m.teamBId!) ? m.teamAId! : m.teamBId!;
      etatTableau = propagerVainqueur(etatTableau, m.id, gagnant);
    }
  }

  it("propage les vainqueurs jusqu'à la finale", () => {
    const finale = etatTableau.find((m) => m.round === nbTours)!;
    expect(finale.winnerId).not.toBeNull();
    expect(finale.teamAId).not.toBeNull();
    expect(finale.teamBId).not.toBeNull();
  });

  const finale = etatTableau.find((m) => m.round === 3)!;
  const champion = finale.winnerId!;
  const finaliste = finale.teamAId === champion ? finale.teamBId! : finale.teamAId!;

  const demies = etatTableau.filter((m) => m.round === 2);
  const demiPerdants = demies.map((m) => (m.teamAId === m.winnerId ? m.teamBId! : m.teamAId!));

  const quarts = etatTableau.filter((m) => m.round === 1);
  const quartsPerdants = quarts.map((m) => (m.teamAId === m.winnerId ? m.teamBId! : m.teamAId!));

  const nonQualifies = equipes
    .map((e) => e.id)
    .filter((id) => !qualification.qualifies.includes(id));

  const cumul = cumulJeuxGagnesTournoi(
    toutesLesMatchsDePoule,
    equipes.map((e) => e.id),
  );

  function trierParCumul(ids: string[]): string[] {
    return [...ids].sort(
      (a, b) =>
        cumul.find((c) => c.teamId === b)!.jeuxGagnes - cumul.find((c) => c.teamId === a)!.jeuxGagnes,
    );
  }

  const classement = classementFinal({
    finaleVainqueurId: champion,
    finalePerdantId: finaliste,
    demiFinalesPerdantIds: demiPerdants,
    quartsPerdantIdsTries: trierParCumul(quartsPerdants),
    nonQualifieIdsTries: trierParCumul(nonQualifies),
  });

  it("produit un classement final complet et cohérent (pas de petite finale)", () => {
    expect(classement).toHaveLength(14);
    expect(classement.find((e) => e.teamId === champion)!.rang).toBe(1);
    expect(classement.find((e) => e.teamId === finaliste)!.rang).toBe(2);

    const rangsDemiPerdants = demiPerdants.map((id) => classement.find((e) => e.teamId === id)!.rang);
    expect(rangsDemiPerdants).toEqual([3, 3]);

    const rangs5a8 = quartsPerdants
      .map((id) => classement.find((e) => e.teamId === id)!.rang)
      .sort((a, b) => a - b);
    expect(rangs5a8).toEqual([5, 6, 7, 8]);

    const rangsNonQualifies = nonQualifies
      .map((id) => classement.find((e) => e.teamId === id)!.rang)
      .sort((a, b) => a - b);
    expect(rangsNonQualifies).toEqual([9, 10, 11, 12, 13, 14]);

    // Aucune équipe en double, aucune manquante.
    expect(new Set(classement.map((e) => e.teamId)).size).toBe(14);
  });
});
