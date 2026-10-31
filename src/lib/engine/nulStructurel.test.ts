import { describe, expect, it } from "vitest";
import { arbitrerMatch, expliquerScoreIndetermine, nulAutorise, type SetSaisi } from "./score";
import { FORMAT_PAR_DEFAUT, type MatchFormat } from "./types";
import { calculerPropagationTableau } from "@/lib/tournoi/propagationTableau";
import { versMatchTermine } from "@/lib/tournoi/classementPoule";

const points = (o: Partial<MatchFormat> = {}): MatchFormat => ({
  ...FORMAT_PAR_DEFAUT,
  modeScore: "points",
  pointsCible: 24,
  sommeExacte: false,
  limiteTempsMin: 20,
  regleFinDeTemps: "leader_gagne",
  ...o,
});
const egalite: SetSaisi[] = [{ jeuxA: 12, jeuxB: 12, tiebreakA: null, tiebreakB: null }];

describe("le nul est un verrou structurel : seule la phase manche l'accepte", () => {
  it("égalité refusée sur une phase de poule, en mode points sans total exact", () => {
    const format = points({ sommeExacte: false });
    const a = arbitrerMatch(egalite, format, "poule");
    expect(a.nul).toBe(false);
    expect(a.vainqueur).toBeNull();
    expect(a.erreur).toMatch(/nul n'est accepté que pour une manche/);
    expect(a.erreur).toMatch(/point en or/);
    expect(expliquerScoreIndetermine(egalite, format, "poule")).toBe(a.erreur);
  });

  it("égalité refusée sur un match de tableau (et de classement), quels que soient les réglages", () => {
    for (const phase of ["tableau", "classement", "classement_5e"]) {
      for (const sommeExacte of [true, false]) {
        const a = arbitrerMatch(egalite, points({ sommeExacte }), phase);
        expect(a.nul, `${phase} sommeExacte=${sommeExacte}`).toBe(false);
        expect(a.vainqueur).toBeNull();
        expect(a.erreur).not.toBeNull();
      }
    }
  });

  it("sur la phase manche, le nul n'est accepté qu'en points sans total exact", () => {
    expect(arbitrerMatch(egalite, points({ sommeExacte: false }), "manche")).toEqual({
      vainqueur: null,
      nul: true,
      erreur: null,
    });
    // Total exact : l'égalité reste refusée, même sur une manche.
    expect(arbitrerMatch(egalite, points({ sommeExacte: true, pointsCible: 24 }), "manche").nul).toBe(false);
    expect(nulAutorise("manche")).toBe(true);
  });

  it("aucune combinaison (mode, total exact, phase hors manche) n'accepte un nul", () => {
    const formats = [
      FORMAT_PAR_DEFAUT,
      points({ sommeExacte: true }),
      points({ sommeExacte: false }),
      points({ sommeExacte: false, limiteTempsMin: null, regleFinDeTemps: "aucune" }),
    ];
    for (const format of formats) {
      for (const phase of ["poule", "tableau", "classement", "classement_5e", "inconnue", ""]) {
        for (const sets of [egalite, [], [{ jeuxA: 0, jeuxB: 0 }]]) {
          expect(arbitrerMatch(sets, format, phase).nul).toBe(false);
        }
      }
    }
  });

  it("un score avec vainqueur reste validable sur toutes les phases", () => {
    const sets: SetSaisi[] = [{ jeuxA: 14, jeuxB: 10 }];
    for (const phase of ["poule", "tableau", "manche"]) {
      expect(arbitrerMatch(sets, points({ sommeExacte: false }), phase)).toEqual({
        vainqueur: "a",
        nul: false,
        erreur: null,
      });
    }
  });

  it("un point en or départage l'égalité sur une phase de poule", () => {
    const sets: SetSaisi[] = [{ jeuxA: 12, jeuxB: 12, tiebreakA: 0, tiebreakB: 1 }];
    expect(arbitrerMatch(sets, points({ sommeExacte: false }), "poule").vainqueur).toBe("b");
  });
});

describe("aucun match sans vainqueur n'alimente un tableau", () => {
  const demi = {
    team_a_id: "A",
    team_b_id: "B",
    next_match_id: "finale",
    next_slot: "a",
    loser_next_match_id: "petite-finale",
    loser_next_slot: "b",
  };

  it("la propagation refuse un vainqueur nul, vide ou absent", () => {
    for (const winner of [null, undefined, ""]) {
      expect(() => calculerPropagationTableau(demi, winner)).toThrow(/sans vainqueur/);
    }
  });

  it("avec un vainqueur, le gagnant monte et le perdant descend", () => {
    expect(calculerPropagationTableau(demi, "B")).toEqual([
      { matchId: "finale", champ: { team_a_id: "B" } },
      { matchId: "petite-finale", champ: { team_b_id: "A" } },
    ]);
  });

  it("un match de tableau en nul est donc refusé avant toute propagation", () => {
    // Chaîne complète : l'arbitrage ne produit jamais « nul » sur le tableau, donc jamais
    // de winnerId nul à propager.
    const a = arbitrerMatch(egalite, points({ sommeExacte: false }), "tableau");
    expect(a.erreur).not.toBeNull();
    expect(a.vainqueur === null && !a.nul).toBe(true);
  });
});

describe("comptage des victoires et classement : jamais de nul hors manche", () => {
  const base = { team_a_id: "A", team_b_id: "B", statut: "valide", match_sets: [] };

  it("un match de poule terminé sans vainqueur fait échouer le classement au lieu de compter une victoire de B", () => {
    expect(() => versMatchTermine({ ...base, winner_id: null })).toThrow(/sans vainqueur/);
    expect(() => versMatchTermine({ ...base, statut: "forfait", winner_id: null })).toThrow(/sans vainqueur/);
  });

  it("un match de poule avec vainqueur est converti normalement", () => {
    expect(versMatchTermine({ ...base, winner_id: "A" }).vainqueurId).toBe("A");
  });
});
