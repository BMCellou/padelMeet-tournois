import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { chargerPlaces } from "@/lib/inscriptions/occupation";
import { repartirSolos, solosAApparier } from "@/lib/inscriptions/solos";

const solo = (playerId: string, statut: string) => ({ id: `r-${playerId}`, playerId, statut });

describe("joueurs seuls : validés sans équipe", () => {
  const solos = [solo("a", "en_attente"), solo("b", "valide"), solo("c", "valide"), solo("d", "en_attente")];

  it("sépare les joueurs à valider des joueurs validés sans binôme", () => {
    const { aValider, valides } = repartirSolos(solos, new Set());
    expect(aValider.map((s) => s.playerId)).toEqual(["a", "d"]);
    expect(valides.map((s) => s.playerId)).toEqual(["b", "c"]);
  });

  it("un joueur validé puis placé en équipe n'est plus « en attente d'un binôme »", () => {
    const { valides } = repartirSolos(solos, new Set(["b"]));
    expect(valides.map((s) => s.playerId)).toEqual(["c"]);
  });

  it("l'appariement reprend les joueurs à valider et les validés sans équipe, pas ceux déjà placés", () => {
    expect(solosAApparier(solos, new Set(["b"])).map((s) => s.playerId)).toEqual(["a", "d", "c"]);
  });

  it("aucun joueur seul : rien à apparier", () => {
    expect(solosAApparier([], new Set())).toEqual([]);
  });
});

describe("places : un joueur seul validé occupe toujours une place", () => {
  // Faux client : chaque table répond avec ses lignes ; on garde les statuts demandés pour les solos.
  function faux(solos: { player_id: string; statut: string }[], membres: string[]) {
    const statutsDemandes: string[][] = [];
    const service = {
      from(table: string) {
        const requete: Record<string, unknown> = {};
        let lignes: unknown[] = [];
        if (table === "tournaments") lignes = [{ max_participants: 8 }];
        if (table === "team_players") lignes = membres.map((player_id) => ({ player_id }));
        if (table === "registrations") lignes = solos;
        const chaine = () => requete;
        requete.select = chaine;
        requete.eq = chaine;
        requete.in = (_col: string, valeurs: string[]) => {
          statutsDemandes.push(valeurs);
          lignes = solos.filter((s) => valeurs.includes(s.statut));
          return requete;
        };
        requete.maybeSingle = async () => ({ data: lignes[0] ?? null });
        requete.then = (ok: (v: unknown) => unknown) => ok({ data: lignes });
        return requete;
      },
    };
    return { service: service as never, statutsDemandes };
  }

  it("compte les solos en attente ET validés, sans compter deux fois un solo placé en équipe", async () => {
    const { service, statutsDemandes } = faux(
      [
        { player_id: "a", statut: "en_attente" },
        { player_id: "b", statut: "valide" },
        { player_id: "c", statut: "valide" }, // validé puis placé en équipe : déjà compté via l'équipe
        { player_id: "x", statut: "annule" },
      ],
      ["c", "d"],
    );
    const places = await chargerPlaces(service, "t1");
    expect(statutsDemandes).toEqual([["en_attente", "valide"]]);
    expect(places.occupees).toBe(4); // a, b, c, d
    expect(places.restantes).toBe(4);
  });
});

describe("branchement", () => {
  const lire = (chemin: string) => readFileSync(join(__dirname, "..", chemin), "utf-8");

  it("l'action de validation ne touche que les inscriptions solo en attente du tournoi", () => {
    const source = lire("src/app/admin/tournois/[id]/inscriptions/actions.ts");
    const corps = source.slice(source.indexOf("export async function validerSolo"), source.indexOf("export async function validerEquipe"));
    expect(corps).toContain('.update({ statut: "valide" })');
    expect(corps).toContain('.eq("type", "solo")');
    expect(corps).toContain('.eq("statut", "en_attente")');
    expect(corps).toContain('.eq("tournament_id", tournamentId)');
    expect(corps).not.toContain("teams");
  });

  it("le tirage des équipes reprend les joueurs validés sans équipe", () => {
    const source = lire("src/app/admin/tournois/[id]/inscriptions/actions.ts");
    expect(source).toContain("solosAApparier(");
    expect(source).toContain('.in("statut", ["en_attente", "valide"])');
  });

  it("l'annulation d'un joueur seul placé en équipe passe par l'équipe, pas seulement par l'inscription solo", () => {
    const source = lire("src/app/t/[slug]/annulationActions.ts");
    expect(source.indexOf('.from("team_players")')).toBeLessThan(source.indexOf('.eq("type", "solo")'));
    expect(source).toContain("if (solo) await service.from(\"registrations\").delete().eq(\"id\", solo.id)");
  });
});
