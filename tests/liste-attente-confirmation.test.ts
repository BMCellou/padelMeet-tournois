import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { lienDesinscription, messageConfirmation } from "@/lib/liste-attente/message";

const lire = (chemin: string) => readFileSync(join(__dirname, "..", chemin), "utf-8");
const TOKEN = "a".repeat(32);

describe("e-mail de confirmation d'inscription à la liste d'attente", () => {
  const m = messageConfirmation("Camille", "https://app.globopadel.fr/", TOKEN, 24);

  it("s'adresse à la personne, confirme l'inscription et annonce la suite", () => {
    expect(m.sujet).toBe("Tu es sur la liste d'attente GloboPadel");
    expect(m.texte).toContain("Bonjour Camille,");
    expect(m.texte).toContain("bien enregistrée");
    expect(m.texte).toContain("24 mois");
  });

  it("propose de créer son compte et contient le lien de désinscription personnel", () => {
    expect(m.texte).toContain("https://app.globopadel.fr/compte/inscription");
    expect(m.texte).toContain(lienDesinscription("https://app.globopadel.fr", TOKEN));
    expect(m.texte).toContain("Pour ne plus en recevoir et supprimer tes données");
  });

  it("n'embarque que deux liens, tous deux sur le site : un message court, sans pièce ni mise en forme", () => {
    const liens = m.texte.match(/https?:\/\/\S+/g) ?? [];
    expect(liens).toHaveLength(2);
    for (const l of liens) expect(l.startsWith("https://app.globopadel.fr/")).toBe(true);
    expect(m.texte).not.toMatch(/<[a-z]/i);
  });
});

describe("envoi de la confirmation", () => {
  const actions = lire("src/app/liste-attente/actions.ts");

  it("n'est envoyé qu'à une nouvelle inscription : un doublon répond par un succès sans rien envoyer", () => {
    const corps = actions.slice(actions.indexOf("async function enregistrer"));
    expect(corps.indexOf('error.code === "23505"')).toBeGreaterThan(-1);
    expect(corps.indexOf('error.code === "23505"')).toBeLessThan(corps.indexOf("after("));
    expect(corps.match(/envoyeursReels\.email/g)).toHaveLength(1);
  });

  it("part après la réponse et un échec d'envoi n'annule jamais l'inscription", () => {
    expect(actions).toContain("after(async () =>");
    expect(actions).toContain(".catch(() => null)");
    expect(actions).toContain("console.error");
  });

  it("l'inscription en un clic envoie la même confirmation (même chemin d'enregistrement)", () => {
    expect(actions.match(/return enregistrer\(parsed\.data, valeurs\)/g)).toHaveLength(2);
  });

  it("les écrans de succès invitent à regarder dans les courriers indésirables", () => {
    expect(lire("src/app/liste-attente/ListeAttenteForm.tsx")).toContain("courriers indésirables");
    expect(lire("src/app/liste-attente/ListeAttenteConnecte.tsx")).toContain("courriers indésirables");
  });
});

describe("champs obligatoires signalés par un astérisque", () => {
  const avecAsterisque = (fichier: string, libelles: string[]) => {
    const source = lire(fichier);
    for (const libelle of libelles) {
      const re = new RegExp(`${libelle.replace(/[/.]/g, "\\$&")}\\s*<Obligatoire />`);
      expect(source, `${fichier} : ${libelle}`).toMatch(re);
    }
    expect(source, fichier).toContain("<LegendeObligatoire />");
  };

  it("formulaire public de liste d'attente", () => {
    avecAsterisque("src/app/liste-attente/ListeAttenteForm.tsx", ["Prénom", "Nom", "E-mail", "Téléphone"]);
    const communs = lire("src/app/liste-attente/ChampsCommuns.tsx");
    expect(communs).toMatch(/Ton niveau \(de 1 à 8\)\s*<Obligatoire \/>/);
    expect(communs).toMatch(/LIBELLE_CONSENTEMENT\}\s*<Obligatoire \/>/);
  });

  it("inscription en un clic (téléphone demandé seulement s'il manque au profil)", () => {
    avecAsterisque("src/app/liste-attente/ListeAttenteConnecte.tsx", ["Téléphone"]);
  });

  it("création de compte, profil et partenaire", () => {
    avecAsterisque("src/app/compte/inscription/page.tsx", ["Prénom", "Nom", "Téléphone", "E-mail", "Mot de passe"]);
    avecAsterisque("src/app/compte/ProfilForm.tsx", ["Prénom", "Nom", "Téléphone"]);
    avecAsterisque("src/app/t/[slug]/InscriptionTournoi.tsx", [
      "Prénom du/de la partenaire",
      "Nom du/de la partenaire",
      "Téléphone du/de la partenaire",
      "E-mail du/de la partenaire",
    ]);
  });

  it("l'astérisque est décoratif et la légende l'explique", () => {
    const c = lire("src/components/Obligatoire.tsx");
    expect(c).toContain('aria-hidden="true"');
    expect(c).toContain("Champs obligatoires");
  });
});

describe("saisie conservée après une erreur", () => {
  it("les actions renvoient ce qui a été saisi avec chaque erreur, et les écrans le remettent", () => {
    const actions = lire("src/app/liste-attente/actions.ts");
    expect(actions.match(/return \{ error: [^}]*valeurs \}/g)?.length).toBeGreaterThanOrEqual(5);
    for (const f of ["ListeAttenteForm", "ListeAttenteConnecte"]) {
      const source = lire(`src/app/liste-attente/${f}.tsx`);
      expect(source, f).toContain("state.valeurs");
      expect(source, f).toContain("valeur={v?.niveau}");
      expect(source, f).toContain("coche={v?.consentement");
    }
  });

  it("la liste déroulante du niveau est recréée avec la valeur conservée (sinon React la vide)", () => {
    expect(lire("src/app/liste-attente/ChampsCommuns.tsx")).toContain("key={valeur ?? \"\"}");
  });
});
