import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { aUnCompte, donneesDepuisProfil, emailsAvecCompte } from "@/lib/liste-attente/compte";
import { inscriptionListeAttenteSchema } from "@/lib/liste-attente/validation";

const lire = (chemin: string) => readFileSync(join(__dirname, "..", chemin), "utf-8");

const profil = { prenom: "Camille", nom: "Durand", email: "camille@exemple.fr", telephone: "06 42 17 93 58" };
const saisie = { telephone: "", niveau: "5", ville: "", consentement: "on" };

describe("inscription en un clic d'une personne connectée", () => {
  it("l'identité vient du profil : prénom, nom, e-mail et téléphone saisis dans le formulaire sont ignorés", () => {
    const d = donneesDepuisProfil(profil, { ...saisie, telephone: "07 00 00 00 00" });
    expect(d).toMatchObject({ prenom: "Camille", nom: "Durand", email: "camille@exemple.fr", telephone: "06 42 17 93 58" });
  });

  it("sans numéro au profil, le téléphone saisi est utilisé, et il reste obligatoire", () => {
    const sansNumero = { ...profil, telephone: null };
    expect(donneesDepuisProfil(sansNumero, { ...saisie, telephone: "06 58 31 47 29" }).telephone).toBe("06 58 31 47 29");
    expect(inscriptionListeAttenteSchema.safeParse(donneesDepuisProfil(sansNumero, saisie)).success).toBe(false);
  });

  it("niveau et consentement restent obligatoires", () => {
    const ok = inscriptionListeAttenteSchema.safeParse(donneesDepuisProfil(profil, saisie));
    expect(ok.success).toBe(true);
    expect(inscriptionListeAttenteSchema.safeParse(donneesDepuisProfil(profil, { ...saisie, consentement: undefined })).success).toBe(false);
    expect(inscriptionListeAttenteSchema.safeParse(donneesDepuisProfil(profil, { ...saisie, niveau: undefined })).success).toBe(false);
  });

  it("l'action lit l'identité de la session, jamais du formulaire", () => {
    const actions = lire("src/app/liste-attente/actions.ts");
    const corps = actions.slice(actions.indexOf("export async function sInscrireListeAttenteConnecte"));
    expect(corps).toContain("getParticipantConnecte()");
    expect(corps).not.toMatch(/formData\.get\("(prenom|nom|email)"\)/);
  });

  it("les deux inscriptions passent par le même plafond et la même insertion", () => {
    const actions = lire("src/app/liste-attente/actions.ts");
    expect(actions.match(/return enregistrer\(parsed\.data, valeurs\)/g)).toHaveLength(2);
    expect(actions.match(/\.insert\(/g)).toHaveLength(1);
  });
});

describe("inscrits qui ont déjà un compte", () => {
  const joueurs = [
    { email: "Camille@Exemple.fr", user_id: "u1" },
    { email: "fantome@exemple.fr", user_id: null },
    { email: null, user_id: "u2" },
  ];

  it("compte les fiches rattachées à un compte, sans tenir compte de la casse", () => {
    const set = emailsAvecCompte(joueurs);
    expect(aUnCompte("camille@exemple.fr", set)).toBe(true);
    expect(aUnCompte(" CAMILLE@exemple.fr ", set)).toBe(true);
  });

  it("une fiche fantôme (sans compte) ou sans e-mail ne compte pas", () => {
    const set = emailsAvecCompte(joueurs);
    expect(aUnCompte("fantome@exemple.fr", set)).toBe(false);
    expect(aUnCompte("inconnu@exemple.fr", set)).toBe(false);
    expect(set.size).toBe(1);
  });
});

describe("écrans", () => {
  it("l'écran de succès propose de créer son compte et revient sur la liste d'attente", () => {
    const form = lire("src/app/liste-attente/ListeAttenteForm.tsx");
    expect(form).toContain("/compte/inscription?next=/liste-attente");
    expect(form).toContain("/compte/connexion?next=/liste-attente");
  });

  it("la page propose l'inscription en un clic aux personnes connectées et ne force pas le cache", () => {
    const page = lire("src/app/liste-attente/page.tsx");
    expect(page).toContain("ListeAttenteConnecte");
    expect(page).toContain("getParticipantConnecte()");
    expect(page).toContain('dynamic = "force-dynamic"');
  });

  it("l'écran admin signale les comptes créés et permet de les sélectionner", () => {
    const panneau = lire("src/app/admin/liste-attente/ListeAttentePanel.tsx");
    expect(panneau).toContain("Compte créé");
    expect(panneau).toContain("Avec un compte");
    expect(panneau).toContain("Sans compte");
  });
});
