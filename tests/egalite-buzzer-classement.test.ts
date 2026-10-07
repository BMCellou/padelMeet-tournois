import { describe, expect, it } from "vitest";
import { versMatchTermine } from "@/lib/tournoi/classementPoule";

describe("un 4-4 départagé au buzzer compte comme un set gagné dans le classement de poule", () => {
  it("le vainqueur du départage gagne le set (1-0 en sets), les jeux restent 4-4", () => {
    const m = versMatchTermine({
      team_a_id: "A",
      team_b_id: "B",
      winner_id: "B",
      statut: "valide",
      match_sets: [{ jeux_a: 4, jeux_b: 4, tiebreak_a: 0, tiebreak_b: 1 }],
    });
    expect(m).toMatchObject({ vainqueurId: "B", setsA: 0, setsB: 1, jeuxA: 4, jeuxB: 4 });
  });
});
