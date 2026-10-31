import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { libelleGroupe } from "@/lib/tournoi/libelleGroupe";

const lire = (chemin: string) => readFileSync(join(__dirname, "..", chemin), "utf-8");

describe("libellé d'un groupe", () => {
  it("poule du premier tour : « Poule A » ; niveau du second tour : « Niveau 1 » sans préfixe", () => {
    expect(libelleGroupe({ nom: "A", niveau: null })).toBe("Poule A");
    expect(libelleGroupe({ nom: "A" })).toBe("Poule A");
    expect(libelleGroupe({ nom: "Niveau 1", niveau: 1 })).toBe("Niveau 1");
  });
});

describe("migration du second tour par niveaux", () => {
  const dossier = join(__dirname, "..", "supabase/migrations");
  const fichier = readdirSync(dossier).find((f) => f.endsWith("_groupes_niveau.sql"));

  it("ajoute seulement une colonne nullable : aucun effet sur les tournois existants", () => {
    expect(fichier).toBeDefined();
    const sql = readFileSync(join(dossier, fichier!), "utf-8");
    expect(sql).toMatch(/alter table groups add column niveau integer;/);
    expect(sql).not.toMatch(/not null|drop |delete |update /i);
  });
});

describe("branchement du second tour dans les écrans de scores", () => {
  it("la génération automatique des poules cède la place aux niveaux pour ce format, avant tout code de tableau", () => {
    const source = lire("src/lib/tournoi/tableauFinal.ts");
    const corps = source.slice(source.indexOf("export async function tenterGenerationAutomatique"));
    expect(corps.indexOf("tenterGenerationNiveaux(")).toBeGreaterThan(-1);
    expect(corps.indexOf("tenterGenerationNiveaux(")).toBeLessThan(corps.indexOf("regenererTableauAuto(supabase"));
  });

  it("une correction du premier tour recompose les niveaux tant qu'aucun n'est commencé, et est refusée ensuite", () => {
    const source = lire("src/lib/tournoi/correctionPoule.ts");
    expect(source).toContain("if (formatAnimation.niveaux) return evaluerCorrectionNiveaux(");
    expect(source).toMatch(/secondTour\.commence[\s\S]{0,200}decision: "refuser"/);
    expect(source).toMatch(/decision: "appliquer_et_regenerer", impact: null/);
  });

  it("l'action de correction recompose le second tour et le trace", () => {
    const source = lire("src/app/admin/tournois/[id]/scores/actions.ts");
    expect(source).toContain("regenererNiveaux(supabase, tournamentId)");
    expect(source).toContain('action: "regeneration_niveaux_correction"');
  });

  it("réinitialiser un score du premier tour est refusé une fois le second commencé, sinon retire le second tour", () => {
    const source = lire("src/app/admin/tournois/[id]/scores/actions.ts");
    expect(source).toMatch(/secondTour\.commence[\s\S]{0,200}impossible de réinitialiser ce score du premier tour/);
    expect(source).toContain("supprimerSecondTour(supabase, tournamentId)");
  });

  it("le second tour ne se supprime jamais s'il a commencé", () => {
    const source = lire("src/lib/tournoi/niveaux.ts");
    const corps = source.slice(source.indexOf("export async function supprimerSecondTour"), source.indexOf("export async function tenterGenerationNiveaux"));
    expect(corps.indexOf("matchCommence")).toBeGreaterThan(-1);
    expect(corps.indexOf("matchCommence")).toBeLessThan(corps.indexOf(".delete()"));
  });
});
