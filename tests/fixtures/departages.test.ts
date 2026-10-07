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
  it("poule unique de 7, 21 matchs, défaut réel de départage (mini-classement compris)", () => {
    expect(matchs).toHaveLength(21);
    expect(DEPARTAGES.criteres).toEqual(["victoires", "confrontation_directe", "mini_classement", "ratio_sets", "ratio_jeux"]);
  });

  it("A. victoires : equipe1 (5) seule en tête", () => {
    expect(e("equipe1").v).toBe(5);
    expect(e("equipe1").rang).toBe(1);
  });

  it("B. confrontation directe (deux équipes) : equipe6 devant equipe7 malgré un moins bon ratio de jeux", () => {
    expect(e("equipe6").v).toBe(e("equipe7").v);
    expect(e("equipe7").ratioJeux).toBeGreaterThan(e("equipe6").ratioJeux);
    expect([e("equipe6").rang, e("equipe7").rang]).toEqual([6, 7]);
  });

  it("C. mini-classement : equipe2 devant le reste du groupe de quatre malgré le plus mauvais ratio de jeux", () => {
    const q = ["equipe2", "equipe3", "equipe4", "equipe5"].map(e);
    expect(new Set(q.map((x) => x.v))).toEqual(new Set([3]));
    expect(Math.min(...q.map((x) => x.ratioJeux))).toBe(e("equipe2").ratioJeux);
    expect(e("equipe2").rang).toBe(2);
  });

  it("D. ratio de jeux : equipe3 devant equipe4 et equipe5 (ratio de sets égal pour tous)", () => {
    expect(new Set(["equipe3", "equipe4", "equipe5"].map((id) => e(id).ratioSets)).size).toBe(1);
    expect(e("equipe3").ratioJeux).toBeGreaterThan(e("equipe4").ratioJeux);
    expect(e("equipe3").rang).toBe(3);
  });

  it("E. réentrance : equipe4 et equipe5, même ratio de jeux, sont départagées par la confrontation directe", () => {
    expect(e("equipe4").ratioJeux).toBe(e("equipe5").ratioJeux);
    expect(e("equipe4").jeuxG).toBe(e("equipe5").jeuxG);
    expect([e("equipe4").rang, e("equipe5").rang]).toEqual([4, 5]);
  });

  it("classement final : tous les rangs sont distincts", () => {
    expect(classement.map((x) => x.rang).sort()).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });
});
