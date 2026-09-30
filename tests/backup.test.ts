import { describe, expect, it } from "vitest";
import { backupsAPurger, cheminBackup } from "@/lib/backup/dump";

describe("cheminBackup", () => {
  it("produit un nom de fichier sans deux-points ni point (compatible chemin de stockage)", () => {
    const nom = cheminBackup(new Date("2026-09-30T03:00:00.000Z"));
    expect(nom).toBe("2026-09-30T03-00-00-000Z.json.gz");
  });

  it("est triable alphabétiquement dans l'ordre chronologique", () => {
    const a = cheminBackup(new Date("2026-09-30T03:00:00.000Z"));
    const b = cheminBackup(new Date("2026-10-01T03:00:00.000Z"));
    expect([b, a].sort()).toEqual([a, b]);
  });
});

describe("backupsAPurger", () => {
  it("garde les N plus récents, purge le reste", () => {
    const noms = ["j5", "j4", "j3", "j2", "j1"]; // du plus récent au plus ancien
    expect(backupsAPurger(noms, 3)).toEqual(["j2", "j1"]);
  });

  it("ne purge rien s'il y en a moins que la limite", () => {
    expect(backupsAPurger(["j1", "j2"], 14)).toEqual([]);
  });

  it("garde 0 = purge tout", () => {
    expect(backupsAPurger(["j1", "j2"], 0)).toEqual(["j1", "j2"]);
  });
});
