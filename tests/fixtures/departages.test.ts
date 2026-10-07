// Vérifie que le scénario « departages » exerce bien ce qu'il documente, indépendamment
// du fichier golden : si quelqu'un change les scores, ce test le dit.

import { describe, expect, it } from "vitest";
import { calculerClassement, type MatchTermine } from "@/lib/engine/classement";
import { genererTours } from "@/lib/engine/tours";
import { DEPARTAGES } from "./departages";

const ids = DEPARTAGES.equipes.map((e) => e.id);
const matchs: MatchTermine[] = genererTours(ids).flatMap((t) => t.rencontres.map(([a, b]) => DEPARTAGES.simulerMatch(a, b)));
const classement = calculerClassement(matchs, ids, DEPARTAGES.criteres);
const e = (id: string) => classement.find((x) => x.teamId === id)!;

describe("scénario departages : chaque égalité exerce le critère annoncé", () => {
  it("poule unique de 7, 21 matchs, défaut réel de départage", () => {
    expect(matchs).toHaveLength(21);
    expect(DEPARTAGES.criteres).toEqual(["victoires", "confrontation_directe", "ratio_sets", "ratio_jeux"]);
  });

  it("A. victoires : equipe1 (5) en tête, equipe7 (0) dernière", () => {
    expect([e("equipe1").v, e("equipe7").v]).toEqual([5, 0]);
    expect([e("equipe1").rang, e("equipe7").rang]).toEqual([1, 7]);
  });

  it("B. confrontation directe : equipe5 devant equipe6 malgré un moins bon ratio de jeux", () => {
    expect(e("equipe5").v).toBe(e("equipe6").v);
    expect(e("equipe6").ratioJeux).toBeGreaterThan(e("equipe5").ratioJeux);
    expect([e("equipe5").rang, e("equipe6").rang]).toEqual([5, 6]);
  });

  it("C. égalité à trois : ratio de sets égal pour tous, le ratio de jeux place equipe2 devant", () => {
    const q = ["equipe2", "equipe3", "equipe4"].map(e);
    expect(new Set(q.map((x) => x.v))).toEqual(new Set([4]));
    expect(new Set(q.map((x) => x.ratioSets)).size).toBe(1);
    expect(e("equipe2").ratioJeux).toBeGreaterThan(e("equipe3").ratioJeux);
    expect(e("equipe2").rang).toBe(2);
  });

  it("D. égalité parfaite : equipe3 et equipe4 ex æquo en bout de chaîne, la suivante est 5e", () => {
    for (const cle of ["v", "setsG", "setsP", "jeuxG", "jeuxP", "ratioSets", "ratioJeux"] as const) {
      expect(e("equipe3")[cle]).toBe(e("equipe4")[cle]);
    }
    expect([e("equipe3").rang, e("equipe4").rang]).toEqual([3, 3]);
    expect(e("equipe5").rang).toBe(5);
  });
});
