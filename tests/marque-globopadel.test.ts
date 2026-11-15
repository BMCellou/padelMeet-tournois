import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const racine = join(__dirname, "..");

function fichiers(dossier: string): string[] {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) return fichiers(chemin);
    return /\.(tsx?|md|css)$/.test(nom) ? [chemin] : [];
  });
}

describe("marque GloboPadel", () => {
  it("l'ancien nom n'apparaît plus nulle part dans le code, les tests ni la documentation", () => {
    const restes = [...fichiers(join(racine, "src")), ...fichiers(join(racine, "docs")), ...fichiers(join(racine, "tests"))]
      .filter((f) => !f.endsWith("marque-globopadel.test.ts"))
      .filter((f) => /PadelMeet/.test(readFileSync(f, "utf-8")));
    expect(restes).toEqual([]);
  });

  it("la marque s'écrit GloboPadel partout (seuls l'adresse du site et les e-mails restent en minuscules)", () => {
    const restes = [...fichiers(join(racine, "src")), ...fichiers(join(racine, "docs")), ...fichiers(join(racine, "tests"))]
      .filter((f) => !f.endsWith("marque-globopadel.test.ts"))
      .filter((f) => /Globopadel|GLOBOPADEL(?!\b)/.test(readFileSync(f, "utf-8").replace(/CONTACT_GLOBOPADEL/g, "")));
    expect(restes).toEqual([]);
  });

  it("le logo, l'onglet du navigateur et les PDF portent le nouveau nom", () => {
    expect(readFileSync(join(racine, "src/components/BrandLogo.tsx"), "utf-8")).toContain("GloboPadel");
    expect(readFileSync(join(racine, "src/app/layout.tsx"), "utf-8")).toContain('title: "GloboPadel"');
    const outils = readFileSync(join(racine, "src/lib/pdf/outils.ts"), "utf-8");
    expect(outils).toContain('doc.setCreator("GloboPadel")');
    expect(outils).toContain('"GloboPadel"');
  });
});
