// Le format « poules + tableau » exposé derrière FormatAnimation reproduit EXACTEMENT
// le moteur existant : on rejoue les scénarios de référence par l'interface (registre,
// genererTours, tourSuivant, classement, estTermine) et on compare au fichier golden,
// figé avant l'introduction de l'abstraction.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CODE_FORMAT_PAR_DEFAUT, getFormat, listerFormats } from "@/lib/engine/formats";
import type { EtatTournoi, MatchEtat } from "@/lib/engine/formats";
import { calculerRepartitionPoules } from "@/lib/engine/poules";
import type { Scenario } from "./fixtures/scenario";
import { DEPARTAGES } from "./fixtures/departages";
import { POULE_UNIQUE_5 } from "./fixtures/poule-unique-5";
import { TOURNOI_25_JUILLET } from "./fixtures/tournoi-25-juillet";

const golden = (nom: string) => JSON.parse(readFileSync(join(__dirname, "golden", `${nom}.json`), "utf-8"));

function etatInitial(sc: Scenario): EtatTournoi {
  return {
    participants: sc.equipes,
    terrains: sc.terrains,
    config: { nbQualifies: sc.nbQualifies, criteres: sc.criteres },
    graine: sc.graineTirage,
    planification: { heureDebut: sc.heureDebut, dureeJeuMin: sc.dureeJeuMin, rotationMin: sc.rotationMin, reposMinMin: sc.reposMinMin },
    matchs: [],
  };
}

describe("registre", () => {
  it("expose un seul format, poules + tableau, par défaut", () => {
    expect(listerFormats().map((f) => f.code)).toEqual(["poules_tableau"]);
    expect(CODE_FORMAT_PAR_DEFAUT).toBe("poules_tableau");
    expect(getFormat("poules_tableau")).toBe(listerFormats()[0]);
  });

  it("refuse un code inconnu avec un message clair", () => {
    expect(() => getFormat("americano")).toThrow(/inconnu/);
    expect(() => getFormat("constructor")).toThrow(/inconnu/);
  });

  it("déclare les propriétés du format historique", () => {
    const f = getFormat("poules_tableau");
    expect({ u: f.uniteClassement, c: f.calendrier, p: f.partenaire, s: f.modeScore, t: f.aUnTableauFinal }).toEqual({
      u: "equipe",
      c: "statique",
      p: "fixe",
      s: "jeux_sets",
      t: true,
    });
    expect(f.groupes).toBeDefined();
    expect(f.phaseFinale).toBeDefined();
  });
});

describe("validerEffectif", () => {
  const f = getFormat("poules_tableau");

  it("refuse moins de 4 équipes avec le message du moteur", () => {
    let attendu = "";
    try {
      calculerRepartitionPoules(3);
    } catch (e) {
      attendu = (e as Error).message;
    }
    expect(f.validerEffectif(3, 2)).toEqual({ ok: false, message: attendu });
  });

  it("accepte 14 équipes, avertit pour une poule unique de 7", () => {
    expect(f.validerEffectif(14, 3)).toEqual({ ok: true });
    const v = f.validerEffectif(7, 2);
    expect(v.ok).toBe(true);
    expect(v.avertissement).toContain("Poule unique de 7");
  });
});

describe.each([TOURNOI_25_JUILLET, POULE_UNIQUE_5, DEPARTAGES])("parité avec le golden : $nom", (sc) => {
  const g = golden(sc.nom);
  const f = getFormat("poules_tableau");
  const etat = etatInitial(sc);

  // 1. Répartition + tirage + tours + placement : tout depuis l'interface.
  const tours = f.genererTours(etat);
  const prevus = tours.flatMap((t) => t.matchs);

  it("la répartition et le tirage (graine fixée) sont ceux du moteur", () => {
    const groupesTires = [...new Set(prevus.map((m) => m.groupeId))];
    expect(groupesTires).toEqual(g.poules.map((p: { id: string }) => p.id));
  });

  it("les tours (exempts compris) sont ceux de genererTours", () => {
    for (const p of g.poules as { id: string; tours: { numero: number; exempt: string | null }[] }[]) {
      for (const t of p.tours) {
        const tour = tours.find((x) => x.numero === t.numero)!;
        const exempt = tour.exempts.find((e) => e.groupeId === p.id)?.participantId ?? null;
        expect(exempt).toBe(t.exempt);
      }
    }
  });

  it("le placement des matchs de poule est celui de planifier (terrain, début, fin)", () => {
    const plan = prevus.map((m) => ({ matchId: m.id, courtId: m.placement!.terrainId, debut: m.placement!.debut, fin: m.placement!.fin }));
    expect(plan).toEqual(g.calendrierPoules);
  });

  // 2. Tous les scores validés, puis classement, tableau, fin.
  const matchsPoule: MatchEtat[] = prevus.map((m) => {
    const r = sc.simulerMatch(m.teamAId!, m.teamBId!);
    return {
      id: m.id, phase: "groupe", groupeId: m.groupeId, tour: m.tour, teamAId: m.teamAId, teamBId: m.teamBId,
      termine: true, vainqueurId: r.vainqueurId, resultat: r, placement: m.placement,
    };
  });
  const groupes = (g.poules as { id: string; nom: string; equipeIds: string[] }[]).map((p) => ({ id: p.id, nom: p.nom, participantIds: p.equipeIds }));
  const etatJoue: EtatTournoi = { ...etat, groupes, matchs: matchsPoule };

  it("le classement de chaque poule est celui de calculerClassement", () => {
    const lignes = f.classement(etatJoue);
    const attendu = (g.classementsPoule as { groupId: string; equipes: unknown[] }[]).flatMap((c) => c.equipes.map((e) => ({ groupId: c.groupId, e })));
    expect(lignes.map((l) => ({ groupId: l.groupeId, e: l.detail }))).toEqual(attendu);
  });

  it("le tour suivant est le tableau du moteur (qualifiés, arbre, 3e place, emplacements)", () => {
    const suivant = f.tourSuivant(etatJoue);
    if (!g.tableau) {
      expect(suivant).toBeNull(); // poule unique : pas de tableau
      return;
    }
    expect(suivant).not.toBeNull();
    const attenduParId = new Map((g.tableau as { id: string }[]).map((m) => [m.id, m as Record<string, unknown>]));
    const principal = suivant!.matchs;
    expect(principal.map((m) => m.id).sort()).toEqual([...attenduParId.keys(), ...(g.matchTroisiemePlace ? [g.matchTroisiemePlace.id] : [])].sort());
    for (const m of principal.filter((x) => x.tour === 1)) {
      const a = attenduParId.get(m.id)!;
      expect([m.teamAId, m.teamBId]).toEqual([a.teamAId, a.teamBId]);
    }
    for (const m of principal) {
      const a = (attenduParId.get(m.id) ?? g.matchTroisiemePlace) as { courtId: string; debut: string; fin: string };
      expect({ terrainId: m.placement!.terrainId, debut: m.placement!.debut, fin: m.placement!.fin }).toEqual({ terrainId: a.courtId, debut: a.debut, fin: a.fin });
    }
    // Déjà généré : plus de tour suivant.
    expect(f.tourSuivant({ ...etatJoue, matchs: [...matchsPoule, { ...matchsPoule[0], id: "x", phase: "finale" }] })).toBeNull();
  });

  it("n'est terminé que lorsque la dernière étape est jouée", () => {
    const partiel = { ...etatJoue, matchs: matchsPoule.map((m, i) => (i === 0 ? { ...m, termine: false } : m)) };
    expect(f.estTermine(partiel)).toBe(false);
    expect(f.tourSuivant(partiel)).toBeNull();
    // Poule unique : tous les matchs de poule joués = terminé. Sinon la finale reste à jouer.
    expect(f.estTermine(etatJoue)).toBe(groupes.length === 1);
  });
});
