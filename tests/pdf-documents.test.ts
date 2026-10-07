import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PDFDocument, PageSizes } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { genererDossierOrganisation } from "@/lib/pdf/dossier";
import { genererResultats } from "@/lib/pdf/resultats";
import { colonnesScore, construireCreneaux, dateEnLettres, groupesFeuilles, tailleDuTableau } from "@/lib/pdf/mise-en-page";
import { PREREGLAGES_FORMAT } from "@/lib/engine/formatMatch";
import { FORMAT_PAR_DEFAUT } from "@/lib/engine/types";
import { construireDonneesTournoi } from "./helpers/donnees-pdf";

const MAINTENANT = new Date("2027-01-15T16:30:00.000Z");
const A4: [number, number] = PageSizes.A4;
const proche = (a: number, b: number) => Math.abs(a - b) < 0.5;

describe("dossier d'organisation (14 équipes, 3 terrains)", async () => {
  const d = construireDonneesTournoi();
  const doc = await genererDossierOrganisation(d, MAINTENANT);
  const texte = (page?: number) => doc.journal.filter((l) => page === undefined || l.page === page).map((l) => l.texte);

  it("produit un PDF valide, rechargeable", async () => {
    expect(Buffer.from(doc.bytes.slice(0, 5)).toString()).toBe("%PDF-");
    const rechargé = await PDFDocument.load(doc.bytes);
    expect(rechargé.getPageCount()).toBe(doc.nbPages);
  });

  it("contient les six sections, chacune commençant sur sa propre page, dans l'ordre", () => {
    expect(doc.sections.map((s) => s.titre)).toEqual([
      "Dossier d'organisation",
      "Composition des poules",
      "Calendrier des matchs",
      "Feuilles de score",
      "Grilles de classement des poules",
      "Tableau final",
    ]);
    const pages = doc.sections.map((s) => s.pageDebut);
    expect(pages[0]).toBe(1);
    expect(new Set(pages).size).toBe(6);
    expect([...pages].sort((a, b) => a - b)).toEqual(pages);
  });

  it("toutes les pages sont au format A4 (portrait ou paysage)", async () => {
    const rechargé = await PDFDocument.load(doc.bytes);
    for (const p of rechargé.getPages()) {
      const { width, height } = p.getSize();
      const portrait = proche(width, A4[0]) && proche(height, A4[1]);
      const paysage = proche(width, A4[1]) && proche(height, A4[0]);
      expect(portrait || paysage).toBe(true);
    }
  });

  it("couverture : nom, club, date en lettres, format en toutes lettres, équipes, terrains", () => {
    const p1 = texte(1).join("\n");
    expect(p1).toContain("Tournoi des Étoiles d'Été");
    expect(p1).toContain("Padel Club de Bordeaux");
    expect(p1).toContain("Samedi 16 janvier 2027");
    expect(p1).toContain("1 set en 7 jeux, point décisif, tie-break en 7 points à 6-6");
    expect(p1).toContain("14");
    expect(p1).toContain("Terrain 1, Terrain 2, Terrain 3");
  });

  it("poules : le nom complet des deux joueurs de chaque équipe, avec accents", () => {
    const section = doc.sections[1].pageDebut;
    const p = texte(section).join("\n");
    for (const e of d.equipes) {
      expect(p + texte(section + 1).join("\n")).toContain(e.joueurs[0]);
      expect(p + texte(section + 1).join("\n")).toContain(e.joueurs[1]);
    }
    expect(p).toContain("Éloïse");
    expect(p).not.toContain("?");
  });

  it("calendrier : une colonne Repos et l'équipe exempte de chaque tour de poule à 5", () => {
    const debut = doc.sections[2].pageDebut;
    const fin = doc.sections[3].pageDebut - 1;
    const tout = doc.journal.filter((l) => l.page >= debut && l.page <= fin).map((l) => l.texte);
    expect(tout.filter((t) => t === "Repos").length).toBeGreaterThan(5);
    expect(tout.some((t) => /^Poule [A-C] : /.test(t) || t.includes("Poule A :") || t.includes("Poule B :"))).toBe(true);
    for (const t of d.terrains) expect(tout).toContain(t.nom);
    // Les matchs de phase finale y figurent, avec la provenance des équipes inconnues.
    expect(tout.some((t) => t.includes("Finale"))).toBe(true);
    expect(tout.some((t) => t.includes("Vainqueur de la demi n°1"))).toBe(true);
  });

  it("feuilles de score : une ligne par match (poules + phase finale), cases selon le format", () => {
    const groupes = groupesFeuilles(d);
    expect(groupes.reduce((n, g) => n + g.matchs.length, 0)).toBe(d.matchs.length);
    const debut = doc.sections[3].pageDebut;
    const fin = doc.sections[4].pageDebut - 1;
    const tout = doc.journal.filter((l) => l.page >= debut && l.page <= fin).map((l) => l.texte);
    expect(tout).toContain("Set 1");
    expect(tout).toContain("TB");
    expect(tout).toContain("Vainqueur");
    expect(tout.some((t) => t.startsWith("Départage en poule, dans l'ordre : 1. Victoires"))).toBe(true);
    expect(tout.some((t) => t.startsWith("Limite de temps 25 min"))).toBe(true);
  });

  it("grilles de classement : une par poule, avec les colonnes demandées", () => {
    const debut = doc.sections[4].pageDebut;
    const fin = doc.sections[5].pageDebut - 1;
    const tout = doc.journal.filter((l) => l.page >= debut && l.page <= fin).map((l) => l.texte);
    for (const col of ["Équipe", "Victoires", "Jeux gagnés", "Jeux perdus", "Différence", "Rang"]) {
      expect(tout.filter((t) => t === col).length).toBeGreaterThanOrEqual(d.poules.length);
    }
    for (const p of d.poules) expect(tout).toContain(`Poule ${p.nom}`);
  });

  it("titres de tours exacts : 8 qualifiés = quarts, demies, finale", async () => {
    const { titreTour } = await import("@/lib/pdf/mise-en-page");
    expect([0, 1, 2].map((t) => titreTour(t, 3))).toEqual(["Quarts de finale", "Demi-finales", "Finale"]);
    expect([0, 1].map((t) => titreTour(t, 2))).toEqual(["Demi-finales", "Finale"]);
    expect([0, 1, 2, 3].map((t) => titreTour(t, 4))).toEqual(["8es de finale", "Quarts de finale", "Demi-finales", "Finale"]);
  });

  it("tableau final : dimensionné selon le nombre de qualifiés (8), avec 3e place", () => {
    const tout = texte(doc.sections[5].pageDebut);
    expect(tout).toContain("8 équipes qualifiées");
    expect(tout.filter((t) => t.startsWith("Quart n°")).length).toBe(4);
    expect(tout.filter((t) => t.startsWith("Demi n°")).length).toBe(2);
    expect(tout).toContain("Finale");
    expect(tout).toContain("Match pour la 3e place");
  });

  it("noir et blanc : aucune couleur dans le code de génération", () => {
    const dossier = join(__dirname, "..", "src/lib/pdf");
    for (const f of readdirSync(dossier).filter((x) => x.endsWith(".ts"))) {
      const source = readFileSync(join(dossier, f), "utf-8");
      expect(source, f).not.toMatch(/\b(rgb|cmyk)\s*\(/);
    }
  });
});

describe("dossier avec calendrier ou poules absents : pas d'erreur", () => {
  it("génère quand même les six sections", async () => {
    const d = construireDonneesTournoi();
    const vide = { ...d, poules: [], matchs: [], classements: [], equipes: [] };
    const doc = await genererDossierOrganisation(vide, MAINTENANT);
    expect(doc.sections).toHaveLength(6);
    expect(doc.journal.some((l) => l.texte.includes("pas encore été tirées"))).toBe(true);
    expect(doc.journal.some((l) => l.texte.includes("pas encore été généré"))).toBe(true);
  });
});

describe("résultats (tournoi terminé)", async () => {
  const d = construireDonneesTournoi({ joue: true });
  const doc = await genererResultats(d);

  it("trois sections : classements de poule, tableau final rempli, classement final", () => {
    expect(doc.sections.map((s) => s.titre)).toEqual([
      "Résultats : classements de poule",
      "Résultats : tableau final",
      "Résultats : classement final",
    ]);
  });

  it("classements de poule remplis (rang 1, victoires) pour chaque poule", () => {
    const p1 = doc.journal.filter((l) => l.page < doc.sections[1].pageDebut).map((l) => l.texte);
    for (const p of d.poules) expect(p1).toContain(`Poule ${p.nom}`);
    expect(p1).toContain("Rang");
    expect(p1).toContain("1");
  });

  it("tableau final rempli : noms des équipes et scores", () => {
    const tout = doc.journal.filter((l) => l.page === doc.sections[1].pageDebut).map((l) => l.texte);
    expect(tout.some((t) => t.includes("DUPONT") || t.includes("Éloïse"))).toBe(true);
    expect(tout.some((t) => /^\d-\d/.test(t))).toBe(true);
    expect(tout).toContain("Match pour la 3e place");
  });

  it("classement final : 14 équipes classées, le champion en tête", () => {
    const tout = doc.journal.filter((l) => l.page >= doc.sections[2].pageDebut).map((l) => l.texte);
    expect(tout).toContain("Équipe");
    const champion = d.matchs.find((m) => m.id === "t3-m1")!.winnerId;
    const nomChampion = d.equipes.find((e) => e.id === champion)!.nom;
    expect(tout.some((t) => nomChampion.startsWith(t.replace(/…$/, "")) || t === nomChampion)).toBe(true);
  });
});

describe("composition", () => {
  it("date en lettres en heure de Paris", () => {
    expect(dateEnLettres("2027-01-16")).toBe("samedi 16 janvier 2027");
  });

  it("colonnes de score selon le format", () => {
    expect(colonnesScore(FORMAT_PAR_DEFAUT).map((c) => c.titre)).toEqual(["Set 1", "TB"]);
    const fft = PREREGLAGES_FORMAT.find((p) => p.id === "fft_b1")!.format;
    expect(colonnesScore(fft).map((c) => c.titre)).toEqual(["Set 1", "TB", "Set 2", "TB", "Super TB"]);
    const st = PREREGLAGES_FORMAT.find((p) => p.id === "super_tiebreak")!.format;
    expect(colonnesScore(st).map((c) => c.titre)).toEqual(["Super TB"]);
    const court = PREREGLAGES_FORMAT.find((p) => p.id === "court")!.format;
    expect(colonnesScore(court).map((c) => c.titre)).toEqual(["Set 1", "TB", "Set 2", "TB", "Super TB"]);
  });

  it("créneaux : repos = équipe exempte du tour, uniquement pour les poules impaires", () => {
    const d = construireDonneesTournoi();
    const creneaux = construireCreneaux(d);
    expect(creneaux.length).toBeGreaterThan(5);
    expect(creneaux.some((c) => c.repos.length > 0)).toBe(true);
    // Chaque créneau liste au plus une cellule par terrain.
    for (const c of creneaux) expect(new Set(c.cellules.map((x) => x.courtId)).size).toBe(c.cellules.length);
  });

  it("taille du tableau : celle du tableau généré, sinon d'après les qualifiés", () => {
    const d = construireDonneesTournoi();
    expect(tailleDuTableau(d)).toBe(8);
    expect(tailleDuTableau({ ...d, matchs: d.matchs.filter((m) => m.phase === "poule") })).toBe(8);
    expect(tailleDuTableau({ ...d, matchs: [], poules: d.poules.slice(0, 1) })).toBe(0);
  });
});

describe("chargement et routes", () => {
  const lire = (chemin: string) => readFileSync(join(__dirname, "..", chemin), "utf-8");

  it("le chargement des documents ne lit aucune donnée de contact", () => {
    const source = lire("src/lib/pdf/charger.ts");
    for (const interdit of ["email", "telephone", "canal_rappel", "user_id", 'select("*"']) {
      expect(source).not.toContain(interdit);
    }
  });

  it("les deux routes sont réservées aux admins ; les résultats exigent un tournoi terminé", () => {
    for (const route of ["dossier", "resultats"]) {
      const source = lire(`src/app/admin/tournois/[id]/${route}/route.ts`);
      expect(source).toContain("estAdmin()");
      expect(source).toContain("403");
      expect(source).toContain('"Content-Type": "application/pdf"');
    }
    const resultats = lire("src/app/admin/tournois/[id]/resultats/route.ts");
    expect(resultats).toContain('statut !== "termine"');
    expect(resultats).toContain("409");
  });

  it("nom de fichier ASCII sans accent ni espace", async () => {
    const { nomFichierPdf } = await import("@/lib/pdf/charger");
    expect(nomFichierPdf("resultats", "Tournoi des Étoiles d'Été !")).toBe("resultats-tournoi-des-etoiles-d-ete.pdf");
    expect(nomFichierPdf("resultats", "")).toBe("resultats.pdf");
  });
});
