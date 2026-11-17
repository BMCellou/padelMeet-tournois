import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { aUnTelephoneValide, schemaTelephone, telephoneObligatoire } from "@/lib/inscriptions/telephone";

const lire = (chemin: string) => readFileSync(join(__dirname, "..", chemin), "utf-8");

describe("téléphone obligatoire", () => {
  it.each(["06 42 17 93 58", "0642179358", "+33 6 42 17 93 58", "0033642179358", "06.42.17.93.58", "07 58 31 47 29", "04 72 18 36 59", "+32 470 12 34 56"])(
    "accepte %s",
    (n) => {
      expect(telephoneObligatoire.safeParse(n).success).toBe(true);
    },
  );

  it("refuse l'absence de numéro : vide, espaces, champ manquant", () => {
    for (const v of ["", "   ", undefined, null]) {
      const r = telephoneObligatoire.safeParse(v);
      expect(r.success, String(v)).toBe(false);
      if (!r.success) expect(r.error.issues[0].message).toBe("Le numéro de téléphone est requis.");
    }
  });

  it("refuse un numéro inexploitable (lettres, trop court)", () => {
    for (const v of ["abc", "0612", "06 12 34", "n/a", "à venir"]) {
      const r = telephoneObligatoire.safeParse(v);
      expect(r.success, v).toBe(false);
      if (!r.success) expect(r.error.issues[0].message).toContain("invalide");
    }
  });

  it.each([
    "06 12 34 56 78", // le numéro d'exemple du formulaire
    "0612345678",
    "+33 6 12 34 56 78",
    "0033612345678",
    "06 00 00 00 00",
    "06 66 66 66 66",
    "06 12 12 12 12",
    "06 98 76 54 32",
    "01 23 45 67 89",
    "08 00 12 98 74", // numéro de service : ne joint pas une personne
    "+33 0 6 42 17 93 58",
  ])("refuse le numéro factice ou impossible %s", (v) => {
    const r = telephoneObligatoire.safeParse(v);
    expect(r.success, v).toBe(false);
    if (!r.success) expect(r.error.issues).toHaveLength(1);
  });

  it("explique qu'un numéro bien formé mais factice ne semble pas réel", () => {
    const r = telephoneObligatoire.safeParse("06 12 34 56 78");
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toContain("ne semble pas réel");
  });

  it("le message précise de qui il s'agit pour le partenaire", () => {
    const r = schemaTelephone("du/de la partenaire").safeParse("");
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toBe("Le numéro de téléphone du/de la partenaire est requis.");
  });

  it("un profil sans numéro (créé avant l'obligation) n'a pas de téléphone valide", () => {
    expect(aUnTelephoneValide(null)).toBe(false);
    expect(aUnTelephoneValide("")).toBe(false);
    // Un numéro déjà enregistré reste utilisable (rappels, contact) même s'il ne passerait plus la saisie.
    expect(aUnTelephoneValide("06 12 34 56 78")).toBe(true);
  });
});

describe("branchement dans l'application", () => {
  it("la création de compte et le profil exigent le numéro", () => {
    const source = lire("src/app/compte/actions.ts");
    expect(source.match(/telephone: telephoneObligatoire/g)).toHaveLength(2);
    expect(source).not.toMatch(/telephone: z\.string\(\)\.trim\(\)\.optional\(\)/);
    // `|| undefined` transformait un champ vide en champ absent, donc valide
    expect(source).not.toContain('formData.get("telephone") || undefined');
  });

  it("l'inscription solo et en paire refusent un joueur sans numéro avant de rien créer", () => {
    const source = lire("src/app/t/[slug]/inscriptionActions.ts");
    for (const [fonction, premiereEcriture] of [
      ["export async function sInscrireSolo", '.from("registrations")'],
      ["export async function sInscrireEnPaire", '.from("players")'],
    ] as const) {
      const corps = source.slice(source.indexOf(fonction));
      const garde = corps.indexOf("aUnTelephoneValide(participant.telephone)");
      expect(garde, fonction).toBeGreaterThan(-1);
      expect(garde, fonction).toBeLessThan(corps.indexOf(premiereEcriture));
    }
  });

  it("la paire exige le numéro du partenaire et l'enregistre sans écraser celui d'une fiche existante", () => {
    const source = lire("src/app/t/[slug]/inscriptionActions.ts");
    expect(source).toContain('telephonePartenaire: schemaTelephone("du/de la partenaire")');
    expect(source).toContain("telephone: parsed.data.telephonePartenaire");
    expect(source).toContain("if (!aUnTelephoneValide(partenaireExistant.telephone))");
  });

  it("les formulaires marquent le champ obligatoire", () => {
    for (const f of ["src/app/compte/inscription/page.tsx", "src/app/compte/ProfilForm.tsx"]) {
      expect(lire(f), f).toMatch(/name="telephone"[\s\S]{0,400}required/);
    }
    expect(lire("src/app/t/[slug]/InscriptionTournoi.tsx")).toMatch(/name="telephonePartenaire"[\s\S]{0,200}required/);
  });
});
