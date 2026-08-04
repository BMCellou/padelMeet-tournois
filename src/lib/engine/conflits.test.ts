import { describe, expect, it } from "vitest";
import { detecterConflits, type MatchPlanifieAvecEquipes } from "./conflits";

const REPOS_MIN = 15;

describe("detecterConflits", () => {
  it("ne signale rien pour un calendrier valide", () => {
    const matches: MatchPlanifieAvecEquipes[] = [
      {
        matchId: "m1",
        courtId: "c1",
        teamAId: "A",
        teamBId: "B",
        debut: "2026-07-25T09:00:00.000Z",
        fin: "2026-07-25T09:25:00.000Z",
      },
      {
        matchId: "m2",
        courtId: "c2",
        teamAId: "C",
        teamBId: "D",
        debut: "2026-07-25T09:00:00.000Z",
        fin: "2026-07-25T09:25:00.000Z",
      },
      {
        // 20 min de repos pour A et C depuis la fin de leur match précédent.
        matchId: "m3",
        courtId: "c1",
        teamAId: "A",
        teamBId: "C",
        debut: "2026-07-25T09:45:00.000Z",
        fin: "2026-07-25T10:10:00.000Z",
      },
    ];
    expect(detecterConflits(matches, REPOS_MIN)).toEqual([]);
  });

  it("détecte un même terrain occupé deux fois en même temps", () => {
    const matches: MatchPlanifieAvecEquipes[] = [
      {
        matchId: "m1",
        courtId: "c1",
        teamAId: "A",
        teamBId: "B",
        debut: "2026-07-25T09:00:00.000Z",
        fin: "2026-07-25T09:25:00.000Z",
      },
      {
        matchId: "m2",
        courtId: "c1",
        teamAId: "C",
        teamBId: "D",
        debut: "2026-07-25T09:10:00.000Z",
        fin: "2026-07-25T09:35:00.000Z",
      },
    ];
    const conflits = detecterConflits(matches, REPOS_MIN);
    expect(conflits).toContainEqual({ type: "meme_terrain", matchIds: ["m1", "m2"] });
  });

  it("détecte une équipe convoquée deux fois en même temps", () => {
    const matches: MatchPlanifieAvecEquipes[] = [
      {
        matchId: "m1",
        courtId: "c1",
        teamAId: "A",
        teamBId: "B",
        debut: "2026-07-25T09:00:00.000Z",
        fin: "2026-07-25T09:25:00.000Z",
      },
      {
        matchId: "m2",
        courtId: "c2",
        teamAId: "A",
        teamBId: "C",
        debut: "2026-07-25T09:10:00.000Z",
        fin: "2026-07-25T09:35:00.000Z",
      },
    ];
    const conflits = detecterConflits(matches, REPOS_MIN);
    expect(conflits).toContainEqual({ type: "equipe_double_reservee", matchIds: ["m1", "m2"] });
  });

  it("détecte un repos insuffisant entre deux matchs d'une même équipe", () => {
    const matches: MatchPlanifieAvecEquipes[] = [
      {
        matchId: "m1",
        courtId: "c1",
        teamAId: "A",
        teamBId: "B",
        debut: "2026-07-25T09:00:00.000Z",
        fin: "2026-07-25T09:25:00.000Z",
      },
      {
        // Reprend seulement 5 min après la fin du match précédent (< 15 min).
        matchId: "m2",
        courtId: "c2",
        teamAId: "A",
        teamBId: "C",
        debut: "2026-07-25T09:30:00.000Z",
        fin: "2026-07-25T09:55:00.000Z",
      },
    ];
    const conflits = detecterConflits(matches, REPOS_MIN);
    expect(conflits).toContainEqual({ type: "repos_insuffisant", matchIds: ["m1", "m2"] });
  });

  it("n'incrimine pas un repos tout juste suffisant", () => {
    const matches: MatchPlanifieAvecEquipes[] = [
      {
        matchId: "m1",
        courtId: "c1",
        teamAId: "A",
        teamBId: "B",
        debut: "2026-07-25T09:00:00.000Z",
        fin: "2026-07-25T09:25:00.000Z",
      },
      {
        // Exactement 15 min de repos.
        matchId: "m2",
        courtId: "c2",
        teamAId: "A",
        teamBId: "C",
        debut: "2026-07-25T09:40:00.000Z",
        fin: "2026-07-25T10:05:00.000Z",
      },
    ];
    expect(detecterConflits(matches, REPOS_MIN)).toEqual([]);
  });
});
