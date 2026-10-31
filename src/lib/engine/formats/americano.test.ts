import { describe, expect, it } from "vitest";
import { getFormat, listerFormats } from "./index";
import { CRITERES_JOUEURS_PAR_DEFAUT, americano, classerJoueurs, genererRotation, nbToursParDefaut, type MancheJouee } from "./americano";
import { SEUIL_AVERTISSEMENT_JOUEURS } from "./americanoRotation";
import type { EtatTournoi, MatchEtat } from "./types";

const joueurs = (n: number) => Array.from({ length: n }, (_, i) => `j${i + 1}`);
const cle = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

function partenariats(r: ReturnType<typeof genererRotation>): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of r.tours) for (const manche of t.manches) {
    for (const p of [manche.paireA, manche.paireB]) m.set(cle(p[0], p[1]), (m.get(cle(p[0], p[1])) ?? 0) + 1);
  }
  return m;
}

describe("genererRotation — Americano parfait (8 joueurs, 2 terrains, 7 tours)", () => {
  for (const graine of [1, 2, 42, 20261022]) {
    it(`graine ${graine} : chacun joue exactement une fois avec chacun des sept autres, aucune exemption`, () => {
      const ids = joueurs(8);
      const r = genererRotation(ids, 7, 2, graine);
      const p = partenariats(r);
      expect(p.size).toBe(28); // 28 partenariats distincts
      expect([...p.values()].every((c) => c === 1)).toBe(true);
      for (const j of ids) {
        const avec = new Set<string>();
        for (const [k] of p) {
          const [a, b] = k.split("|");
          if (a === j) avec.add(b);
          if (b === j) avec.add(a);
        }
        expect(avec.size).toBe(7);
      }
      expect(r.tours).toHaveLength(7);
      for (const t of r.tours) {
        expect(t.exempts).toEqual([]);
        expect(t.manches).toHaveLength(2);
        const jouants = t.manches.flatMap((m) => [...m.paireA, ...m.paireB]);
        expect(new Set(jouants).size).toBe(8); // chacun joue à chaque tour, jamais deux fois
      }
      expect(r.statistiques.partenariatsDistincts).toBe(28);
      expect(r.statistiques.partenariatsRepetes).toBe(0);
      expect(r.statistiques.ecartExemptions).toBe(0);
    });
  }
});

describe("genererRotation — zéro partenariat répété à 12 et 16 joueurs", () => {
  it.each([
    [12, 3, 7],
    [16, 4, 7],
  ])("%i joueurs, %i terrains, %i tours (plusieurs graines)", (n, terrains, tours) => {
    for (const graine of [1, 7, 42, 99, 12345]) {
      const r = genererRotation(joueurs(n), tours, terrains, graine);
      expect(r.statistiques.partenariatsRepetes).toBe(0);
      expect(r.statistiques.partenariatsDistincts).toBe((n / 2) * tours);
      expect(r.tours.every((t) => t.exempts.length === 0 && t.manches.length === n / 4)).toBe(true);
    }
  });
});

describe("genererRotation — exemptions (effectif non multiple de 4 ou terrains insuffisants)", () => {
  it("10 joueurs, 2 terrains, 8 tours : 2 exemptés par tour, répartis à ±1 près", () => {
    for (const graine of [1, 2, 3, 42, 777, 20261022]) {
      const r = genererRotation(joueurs(10), 8, 2, graine);
      expect(r.tours.every((t) => t.exempts.length === 2 && t.manches.length === 2)).toBe(true);
      const parJoueur = Object.values(r.statistiques.exemptionsParJoueur);
      expect(parJoueur.reduce((s, x) => s + x, 0)).toBe(16);
      expect(Math.max(...parJoueur) - Math.min(...parJoueur)).toBeLessThanOrEqual(1);
      expect(r.statistiques.ecartExemptions).toBeLessThanOrEqual(1);
      expect(parJoueur.every((x) => x === 1 || x === 2)).toBe(true);
    }
  });

  it("un exempté ne joue pas ce tour-là, les autres jouent tous une fois", () => {
    const r = genererRotation(joueurs(10), 8, 2, 5);
    for (const t of r.tours) {
      const jouants = t.manches.flatMap((m) => [...m.paireA, ...m.paireB]);
      expect(new Set(jouants).size).toBe(8);
      expect(jouants.filter((j) => t.exempts.includes(j))).toEqual([]);
    }
  });

  it("6 joueurs sur 1 terrain, 6 tours : 2 exemptions par joueur", () => {
    const r = genererRotation(joueurs(6), 6, 1, 3);
    expect(Object.values(r.statistiques.exemptionsParJoueur)).toEqual([2, 2, 2, 2, 2, 2]);
  });

  it("16 joueurs mais 3 terrains : 4 exemptés par tour, équitablement", () => {
    const r = genererRotation(joueurs(16), 7, 3, 9);
    expect(r.tours.every((t) => t.exempts.length === 4 && t.manches.length === 3)).toBe(true);
    expect(r.statistiques.ecartExemptions).toBeLessThanOrEqual(1);
  });

  it("jamais deux fois le même terrain pour deux manches d'un même tour", () => {
    const r = genererRotation(joueurs(12), 7, 3, 4);
    for (const t of r.tours) expect(new Set(t.manches.map((m) => m.terrainIndex)).size).toBe(t.manches.length);
  });
});

describe("genererRotation — reproductibilité, garde-fous", () => {
  it("la même graine redonne exactement la même rotation, une autre graine une autre", () => {
    const a = genererRotation(joueurs(12), 7, 3, 20261022);
    const b = genererRotation(joueurs(12), 7, 3, 20261022);
    const c = genererRotation(joueurs(12), 7, 3, 20261023);
    expect(b).toEqual(a);
    expect(a.graine).toBe(20261022);
    expect(JSON.stringify(c.tours)).not.toBe(JSON.stringify(a.tours));
  });

  it("au-delà de 40 joueurs : avertissement, pas de blocage", () => {
    const r = genererRotation(joueurs(SEUIL_AVERTISSEMENT_JOUEURS + 4), 6, 11, 1);
    expect(r.tours).toHaveLength(6);
    expect(r.avertissements.some((a) => a.includes("au-delà de 40"))).toBe(true);
    const v = americano.validerEffectif(SEUIL_AVERTISSEMENT_JOUEURS + 4, 11);
    expect(v.ok).toBe(true);
    expect(v.avertissement).toContain("40");
  });

  it("avertit quand le nombre de tours dépasse n - 1 (partenariats forcément répétés)", () => {
    const r = genererRotation(joueurs(8), 9, 2, 1);
    expect(r.avertissements.some((a) => a.includes("se répètent"))).toBe(true);
  });

  it("refuse les entrées impossibles", () => {
    expect(() => genererRotation(joueurs(3), 3, 1, 1)).toThrow(/4 joueurs/);
    expect(() => genererRotation(["a", "a", "b", "c"], 3, 1, 1)).toThrow(/qu'une fois/);
    expect(() => genererRotation(joueurs(8), 0, 2, 1)).toThrow(/tours/);
    expect(() => genererRotation(joueurs(8), 3, 0, 1)).toThrow(/terrain/);
  });
});

describe("format Americano — propriétés et registre", () => {
  it("est enregistré et déclare ses propriétés", () => {
    expect(listerFormats().map((f) => f.code)).toContain("americano");
    const f = getFormat("americano");
    expect({ u: f.uniteClassement, c: f.calendrier, p: f.partenaire, s: f.modeScore, t: f.aUnTableauFinal }).toEqual({
      u: "joueur", c: "statique", p: "tournant", s: "points", t: false,
    });
    expect(f.groupes).toBeUndefined();
    expect(f.phaseFinale).toBeUndefined();
    expect(f.phases).toEqual([{ code: "manches", libelle: "Manches" }]);
  });

  it("déclare ses phases : ['manches'] ; poules + tableau déclare les siennes", () => {
    expect(getFormat("americano").phases.map((p) => p.code)).toEqual(["manches"]);
    expect(getFormat("poules_tableau").phases.map((p) => p.code)).toEqual(["poule", "quarts", "demis", "finale", "classement"]);
    const phaseDe = getFormat("americano").resoudrePhases([]);
    expect(phaseDe({ phase: "manche", round: 3 })).toBe("manches");
    expect(phaseDe({ phase: "poule", round: 1 })).toBeNull();
  });

  it("valide l'effectif et annonce les exemptés", () => {
    expect(americano.validerEffectif(3, 1).ok).toBe(false);
    expect(americano.validerEffectif(8, 0).ok).toBe(false);
    expect(americano.validerEffectif(12, 3)).toEqual({ ok: true });
    expect(americano.validerEffectif(14, 3).avertissement).toBe("14 inscrits — 2 joueurs seront exemptés à chaque tour.");
    expect(americano.validerEffectif(13, 3).avertissement).toBe("13 inscrits — 1 joueur sera exempté à chaque tour.");
  });

  it("nombre de tours par défaut : un partenaire différent à chaque tour, jusqu'à 7", () => {
    expect([nbToursParDefaut(8), nbToursParDefaut(12), nbToursParDefaut(5)]).toEqual([7, 7, 4]);
  });
});

describe("format Americano — genererTours : une manche = deux équipes éphémères + un match", () => {
  const etat: EtatTournoi = {
    participants: joueurs(8).map((id) => ({ id })),
    terrains: [{ id: "c1", ordre: 1 }, { id: "c2", ordre: 2 }],
    config: { nbTours: 7 },
    graine: 42,
    planification: { heureDebut: "2026-10-22T17:00:00.000Z", dureeJeuMin: 20, rotationMin: 5, reposMinMin: 0 },
    matchs: [],
  };
  const tours = americano.genererTours(etat);

  it("7 tours de 2 manches, sur les terrains du tournoi", () => {
    expect(tours).toHaveLength(7);
    expect(tours.flatMap((t) => t.matchs)).toHaveLength(14);
    for (const t of tours) expect(new Set(t.matchs.map((m) => m.terrainId))).toEqual(new Set(["c1", "c2"]));
  });

  it("chaque manche crée deux équipes éphémères, tour d'origine renseigné, référencées par le match", () => {
    for (const t of tours) for (const m of t.matchs) {
      expect(m.phase).toBe("manche");
      const [a, b] = m.equipesEphemeres!;
      expect([m.teamAId, m.teamBId]).toEqual([a.id, b.id]);
      expect(a.tourOrigine).toBe(t.numero);
      expect(b.tourOrigine).toBe(t.numero);
      expect(new Set([...a.joueurIds, ...b.joueurIds]).size).toBe(4);
    }
    const ids = tours.flatMap((t) => t.matchs).flatMap((m) => m.equipesEphemeres!.map((e) => e.id));
    expect(new Set(ids).size).toBe(28); // jamais deux manches sur la même équipe éphémère
  });

  it("place les tours à la suite, une manche par terrain", () => {
    expect(tours[0].matchs[0].placement!.debut).toBe("2026-10-22T17:00:00.000Z");
    expect(tours[0].matchs[0].placement!.fin).toBe("2026-10-22T17:20:00.000Z");
    expect(tours[1].matchs[0].placement!.debut).toBe("2026-10-22T17:25:00.000Z");
  });

  it("calendrier statique : jamais de tour suivant à ajouter", () => {
    expect(americano.tourSuivant(etat)).toBeNull();
  });
});

// ── Classement individuel, vérifié à la main ────────────────────────────
// 5 joueurs, 1 terrain, 5 tours de 16 points (total exact), un exempté par tour.
//   T1 (E repose) : A+B 10 – 6 C+D     T2 (D repose) : A+C  9 – 7 B+E
//   T3 (C repose) : A+E 11 – 5 B+D     T4 (B repose) : A+D  7 – 9 C+E
//   T5 (A repose) : B+C 12 – 4 D+E
// À la main :
//   A : 10+9+11+7 = 37 marqués, 6+7+5+9 = 27 encaissés, +10, 3 V sur 4 manches, 1 exemption
//   C :  6+9+9+12 = 36 marqués, 10+7+7+4 = 28 encaissés,  +8, 3 V sur 4 manches, 1 exemption
//   B : 10+7+5+12 = 34 marqués,  6+9+11+4 = 30 encaissés,  +4, 2 V sur 4 manches, 1 exemption
//   E :  7+11+9+4 = 31 marqués,  9+5+7+12 = 33 encaissés,  -2, 2 V sur 4 manches, 1 exemption
//   D :  6+5+7+4  = 22 marqués, 10+11+9+12 = 42 encaissés, -20, 0 V sur 4 manches, 1 exemption
//   Classement : A (1), C (2), B (3), E (4), D (5). Contrôle : 37+36+34+31+22 = 160 = 5 manches × 32.
describe("classement individuel — journée complète rejouée de bout en bout", () => {
  const plan: [number, [string, string], [string, string], number, number][] = [
    [1, ["A", "B"], ["C", "D"], 10, 6],
    [2, ["A", "C"], ["B", "E"], 9, 7],
    [3, ["A", "E"], ["B", "D"], 11, 5],
    [4, ["A", "D"], ["C", "E"], 7, 9],
    [5, ["B", "C"], ["D", "E"], 12, 4],
  ];
  const equipes = plan.flatMap(([t, a, b]) => [
    { id: `eph-t${t}-a`, joueurIds: a, tourOrigine: t },
    { id: `eph-t${t}-b`, joueurIds: b, tourOrigine: t },
  ]);
  const matchs: MatchEtat[] = plan.map(([t, , , pa, pb]) => ({
    id: `m${t}`, phase: "manche", groupeId: null, tour: t,
    teamAId: `eph-t${t}-a`, teamBId: `eph-t${t}-b`, termine: true,
    vainqueurId: pa > pb ? `eph-t${t}-a` : `eph-t${t}-b`,
    resultat: { teamAId: `eph-t${t}-a`, teamBId: `eph-t${t}-b`, vainqueurId: pa > pb ? `eph-t${t}-a` : `eph-t${t}-b`, setsA: pa > pb ? 1 : 0, setsB: pa > pb ? 0 : 1, jeuxA: pa, jeuxB: pb },
  }));
  const etat: EtatTournoi = {
    participants: ["A", "B", "C", "D", "E"].map((id) => ({ id })),
    terrains: [{ id: "c1", ordre: 1 }],
    config: { nbTours: 5 },
    graine: 1,
    matchs,
    equipesEphemeres: equipes as EtatTournoi["equipesEphemeres"],
  };
  const lignes = americano.classement(etat);
  const de = (id: string) => lignes.find((l) => l.participantId === id)!;

  it("totaux de chaque joueur conformes au calcul à la main", () => {
    expect(["A", "B", "C", "D", "E"].map((id) => [de(id).pointsMarques, de(id).pointsEncaisses, de(id).difference])).toEqual([
      [37, 27, 10], [34, 30, 4], [36, 28, 8], [22, 42, -20], [31, 33, -2],
    ]);
    expect(["A", "B", "C", "D", "E"].map((id) => de(id).victoires)).toEqual([3, 2, 3, 0, 2]);
    expect(["A", "B", "C", "D", "E"].map((id) => de(id).joues)).toEqual([4, 4, 4, 4, 4]);
    expect(["A", "B", "C", "D", "E"].map((id) => de(id).toursExempt)).toEqual([1, 1, 1, 1, 1]);
    expect(lignes.reduce((s, l) => s + (l.pointsMarques ?? 0), 0)).toBe(160);
  });

  it("classe A, C, B, E, D", () => {
    expect([...lignes].sort((a, b) => a.rang - b.rang).map((l) => l.participantId)).toEqual(["A", "C", "B", "E", "D"]);
    expect(["A", "C", "B", "E", "D"].map((id) => de(id).rang)).toEqual([1, 2, 3, 4, 5]);
  });

  it("la journée est terminée quand toutes les manches des 5 tours sont validées", () => {
    expect(americano.estTermine(etat)).toBe(true);
    expect(americano.estTermine({ ...etat, matchs: matchs.map((m, i) => (i === 4 ? { ...m, termine: false } : m)) })).toBe(false);
    expect(americano.estTermine({ ...etat, matchs: matchs.slice(0, 3) })).toBe(false); // 3 tours sur 5
    expect(americano.estTermine({ ...etat, matchs: [] })).toBe(false);
  });
});

describe("classement individuel — départage et mode « points par manche »", () => {
  const m = (tour: number, a: [string, string], b: [string, string], pa: number, pb: number): MancheJouee => ({
    tour, campA: a, campB: b, pointsA: pa, pointsB: pb, vainqueur: pa > pb ? "a" : pb > pa ? "b" : null,
  });

  it("à égalité de points : différence, puis victoires, puis confrontation directe, puis moins d'exemptions", () => {
    // X et Y marquent autant (20) ; X encaisse moins (différence supérieure).
    const manches = [m(1, ["X", "P"], ["Q", "R"], 10, 6), m(2, ["X", "Q"], ["P", "R"], 10, 8), m(1, ["Y", "S"], ["T", "U"], 10, 9), m(2, ["Y", "T"], ["S", "U"], 10, 11)];
    const l = classerJoueurs(["X", "Y"], manches, [1, 2]);
    expect(l.find((x) => x.joueurId === "X")!.pointsMarques).toBe(20);
    expect(l.find((x) => x.joueurId === "Y")!.pointsMarques).toBe(20);
    expect(l.map((x) => [x.joueurId, x.rang])).toEqual([["X", 1], ["Y", 2]]);
  });

  it("confrontation directe : deux joueurs à égalité sur tout le reste, celui qui a battu l'autre passe devant", () => {
    // M : bat N 10-6 (+4), puis perd 6-10 (-4) → 16 marqués, 16 encaissés, 1 victoire.
    // N : perd contre M 6-10 (-4), puis gagne 10-6 (+4) → 16 marqués, 16 encaissés, 1 victoire.
    const manches = [
      m(1, ["M", "A"], ["N", "B"], 10, 6),
      m(2, ["M", "C"], ["D", "E"], 6, 10),
      m(3, ["N", "F"], ["G", "H"], 10, 6),
    ];
    const l = classerJoueurs(["N", "M"], manches, [1, 2, 3]);
    const get = (id: string) => l.find((x) => x.joueurId === id)!;
    expect([get("M").pointsMarques, get("M").difference, get("M").victoires]).toEqual([16, 0, 1]);
    expect([get("N").pointsMarques, get("N").difference, get("N").victoires]).toEqual([16, 0, 1]);
    expect(get("M").toursExempt).toBe(get("N").toursExempt);
    expect(l.map((x) => [x.joueurId, x.rang])).toEqual([["M", 1], ["N", 2]]); // même si N est listé en premier
  });

  it("moins d'exemptions : dernier critère, avantage à celui qui a le moins attendu", () => {
    // X joue 2 manches nulles 5-5, Y une seule manche nulle 10-10 : mêmes points (10), même différence (0),
    // aucune victoire. X n'a jamais été exempté, Y l'a été au tour 2.
    const manches = [m(1, ["X", "A"], ["B", "C"], 5, 5), m(2, ["X", "D"], ["E", "F"], 5, 5), m(1, ["Y", "G"], ["H", "I"], 10, 10)];
    const l = classerJoueurs(["Y", "X"], manches, [1, 2], ["points_marques", "difference", "victoires", "moins_exemptions"]);
    expect(l.map((x) => [x.joueurId, x.toursExempt, x.rang])).toEqual([["X", 0, 1], ["Y", 1, 2]]);
  });

  it("égalité parfaite sur tous les critères : ex æquo", () => {
    const manches = [m(1, ["X", "A"], ["B", "C"], 8, 8), m(1, ["Y", "D"], ["E", "F"], 8, 8)];
    const l = classerJoueurs(["X", "Y"], manches, [1]);
    expect(l.map((x) => x.rang)).toEqual([1, 1]);
  });

  it("« points par manche » : celui qui a été exempté n'est pas pénalisé par un total brut plus faible", () => {
    // X : 2 manches, 30 points (15 par manche). Y : 3 manches, 36 points (12 par manche).
    const manches: MancheJouee[] = [
      m(1, ["X", "A"], ["B", "C"], 15, 1), m(2, ["X", "D"], ["E", "F"], 15, 1),
      m(1, ["Y", "G"], ["H", "I"], 12, 4), m(2, ["Y", "J"], ["K", "L"], 12, 4), m(3, ["Y", "M"], ["N", "O"], 12, 4),
    ];
    const total = classerJoueurs(["X", "Y"], manches, [1, 2, 3], CRITERES_JOUEURS_PAR_DEFAUT, "total");
    expect(total[0].joueurId).toBe("Y"); // 36 > 30
    const parManche = classerJoueurs(["X", "Y"], manches, [1, 2, 3], CRITERES_JOUEURS_PAR_DEFAUT, "par_manche");
    expect(parManche[0].joueurId).toBe("X"); // 15 > 12
    expect(parManche.find((l) => l.joueurId === "X")!.pointsParManche).toBe(15);
  });

  it("un joueur sans manche : valeurs à zéro, jamais NaN ni Infinity", () => {
    const l = classerJoueurs(["X", "Z"], [m(1, ["X", "A"], ["B", "C"], 9, 7)], [1], CRITERES_JOUEURS_PAR_DEFAUT, "par_manche");
    const z = l.find((x) => x.joueurId === "Z")!;
    expect([z.mancheJouees, z.pointsParManche, z.pointsMarques]).toEqual([0, 0, 0]);
    expect(l.every((x) => Number.isFinite(x.pointsParManche) && Number.isFinite(x.rang))).toBe(true);
  });
});
