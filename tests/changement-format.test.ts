import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  aUnTirage,
  formatsCompatibles,
  tournoiNonCommence,
  verifierChangementFormat,
  type DemandeChangementFormat,
} from "@/lib/tournoi/changementFormat";

const vierge = { statut: "publie", statutsMatchs: [] as string[], nbGroupes: 0 };

function demande(sur: Partial<DemandeChangementFormat> = {}): DemandeChangementFormat {
  return {
    codeActuel: "poules_tableau",
    codeCible: "poules_niveaux",
    statutDemande: "publie",
    etat: vierge,
    tirageSupprimeConfirme: false,
    nbQualifiesSaisi: null,
    nbQualifiesEnregistre: 8,
    ...sur,
  };
}

describe("formats vers lesquels on peut basculer", () => {
  it("un format à équipes se change contre les autres formats à équipes, jamais contre l'Americano", () => {
    expect(formatsCompatibles("poules_tableau").map((f) => f.code)).toEqual(["poules_tableau", "poules_niveaux", "poules_niveaux_finale"]);
    expect(formatsCompatibles("poules_niveaux").map((f) => f.code)).toContain("poules_tableau");
  });

  it("l'Americano (inscriptions par joueur) n'a que lui-même", () => {
    expect(formatsCompatibles("americano").map((f) => f.code)).toEqual(["americano"]);
  });
});

describe("tournoi pas commencé", () => {
  it("brouillon et publié sans match entamé : oui, même avec un tirage et un calendrier prêts", () => {
    expect(tournoiNonCommence({ statut: "brouillon", statutsMatchs: [], nbGroupes: 0 })).toBe(true);
    expect(tournoiNonCommence({ statut: "publie", statutsMatchs: ["a_venir", "pret"], nbGroupes: 3 })).toBe(true);
  });

  it("un match entamé (en cours, validé, forfait) ou un statut avancé : non", () => {
    for (const s of ["en_cours", "valide", "forfait", "termine"]) {
      expect(tournoiNonCommence({ statut: "publie", statutsMatchs: ["a_venir", s], nbGroupes: 3 }), s).toBe(false);
    }
    expect(tournoiNonCommence({ statut: "en_cours", statutsMatchs: [], nbGroupes: 0 })).toBe(false);
    expect(tournoiNonCommence({ statut: "termine", statutsMatchs: [], nbGroupes: 0 })).toBe(false);
  });

  it("un tirage existe dès qu'une poule ou un match existe", () => {
    expect(aUnTirage(vierge)).toBe(false);
    expect(aUnTirage({ ...vierge, nbGroupes: 1 })).toBe(true);
    expect(aUnTirage({ ...vierge, statutsMatchs: ["a_venir"] })).toBe(true);
  });
});

describe("verifierChangementFormat", () => {
  it("avant tout tirage : accepté sans confirmation, sans rien à supprimer", () => {
    expect(verifierChangementFormat(demande())).toEqual({ ok: true, supprimerTirage: false, nbQualifies: null });
  });

  it("vers un format avec tableau final : garde le nombre de qualifiés enregistré, ou celui saisi", () => {
    const base = { codeActuel: "poules_niveaux", codeCible: "poules_tableau" };
    expect(verifierChangementFormat(demande({ ...base, nbQualifiesEnregistre: 8 }))).toMatchObject({ ok: true, nbQualifies: 8 });
    expect(verifierChangementFormat(demande({ ...base, nbQualifiesSaisi: 4 }))).toMatchObject({ ok: true, nbQualifies: 4 });
  });

  it("vers un format avec tableau final sans aucun nombre de qualifiés : refusé", () => {
    const r = verifierChangementFormat(demande({ codeActuel: "poules_niveaux", codeCible: "poules_niveaux_finale", nbQualifiesEnregistre: null }));
    expect(r).toEqual({ ok: false, error: expect.stringContaining("qualifiés") });
  });

  it("vers un format sans tableau final : le nombre de qualifiés est effacé", () => {
    expect(verifierChangementFormat(demande({ nbQualifiesSaisi: 8 }))).toMatchObject({ ok: true, nbQualifies: null });
  });

  it("tirage ou calendrier existants : refusé sans confirmation, accepté avec (et signalé à supprimer)", () => {
    const etat = { statut: "publie", statutsMatchs: ["a_venir"], nbGroupes: 3 };
    expect(verifierChangementFormat(demande({ etat }))).toEqual({ ok: false, error: expect.stringContaining("confirme") });
    expect(verifierChangementFormat(demande({ etat, tirageSupprimeConfirme: true }))).toEqual({ ok: true, supprimerTirage: true, nbQualifies: null });
  });

  it("un match déjà entamé : refusé, même avec la confirmation", () => {
    const etat = { statut: "publie", statutsMatchs: ["a_venir", "valide"], nbGroupes: 3 };
    expect(verifierChangementFormat(demande({ etat, tirageSupprimeConfirme: true }))).toEqual({ ok: false, error: expect.stringContaining("commencé") });
  });

  it("tournoi en cours ou terminé, ou passé en cours dans le même enregistrement : refusé", () => {
    expect(verifierChangementFormat(demande({ etat: { ...vierge, statut: "en_cours" }, statutDemande: "en_cours" })).ok).toBe(false);
    expect(verifierChangementFormat(demande({ etat: { ...vierge, statut: "termine" } })).ok).toBe(false);
    expect(verifierChangementFormat(demande({ statutDemande: "en_cours" })).ok).toBe(false);
  });

  it("entre les familles (Americano ↔ équipes) : refusé", () => {
    expect(verifierChangementFormat(demande({ codeActuel: "poules_tableau", codeCible: "americano" })).ok).toBe(false);
    expect(verifierChangementFormat(demande({ codeActuel: "americano", codeCible: "poules_niveaux" })).ok).toBe(false);
  });
});

describe("action serveur", () => {
  const source = readFileSync(join(__dirname, "..", "src/app/admin/tournois/actions.ts"), "utf-8");

  it("relit l'état du tournoi en base et vérifie avant de supprimer ou d'écrire", () => {
    const i = source.indexOf("export async function modifierTournoi");
    const corps = source.slice(i);
    const lecture = corps.indexOf('.from("matches").select("statut")');
    const verif = corps.indexOf("verifierChangementFormat(");
    const suppression = corps.indexOf('.from("matches").delete()');
    const ecriture = corps.indexOf("format_animation: changementFormat.code");
    expect(lecture).toBeGreaterThan(-1);
    expect(verif).toBeGreaterThan(lecture);
    expect(suppression).toBeGreaterThan(verif);
    expect(ecriture).toBeGreaterThan(suppression);
  });

  it("trace le changement dans le journal d'audit", () => {
    expect(source).toContain('action: "changement_format"');
  });
});
