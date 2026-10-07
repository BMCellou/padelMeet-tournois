// « Dossier d'organisation » : couverture, poules, calendrier, feuilles de
// score vierges, grilles de classement vierges, arbre du tableau final vierge.
// A4, français, heures de Paris, noir et blanc.

import { resumerFormat } from "@/lib/engine/formatMatch";
import { LIBELLES_PHASES, PHASES_FORMAT } from "@/lib/engine/formatPhases";
import { formatHeureParis } from "@/lib/temps";
import { dessinerArbre, dessinerBoite } from "./arbre-dessin";
import {
  coteMatch,
  colonnesScore,
  construireCreneaux,
  dateEnLettres,
  etiquetteMatch,
  groupesFeuilles,
  libelleCriteres,
  libellesPhaseFinale,
  majuscule,
  nomEquipe,
  rappelBuzzer,
  tailleDuTableau,
} from "./mise-en-page";
import { MARGE, Rendu, type SectionRendue } from "./outils";
import type { DonneesTournoi } from "./types";

export interface DocumentPdf {
  bytes: Uint8Array;
  sections: SectionRendue[];
  nbPages: number;
  /** Texte écrit, page par page. */
  journal: { page: number; texte: string }[];
}

const FOND_ENTETE = 0.88;

function dateHeureParis(d: Date): string {
  const date = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
  return `${date} à ${formatHeureParis(d.toISOString())}`;
}

// ── 1. Couverture ───────────────────────────────────────────────────────

function couverture(r: Rendu, d: DonneesTournoi, maintenant: Date): void {
  r.debutSection("Dossier d'organisation");
  const t = d.tournoi;

  for (const ligne of r.retourALaLigne(t.nom, r.largeurUtile, 26, true)) {
    r.texte(MARGE, r.y - 26, ligne, { taille: 26, gras: true });
    r.y -= 32;
  }
  r.y -= 6;

  const club = d.club ? `${d.club.nom}${d.club.ville ? ` - ${d.club.ville}` : ""}` : "Club à définir";
  r.texte(MARGE, r.y - 14, club, { taille: 14 });
  r.y -= 20;
  r.texte(MARGE, r.y - 14, majuscule(dateEnLettres(t.date)), { taille: 14 });
  r.y -= 34;

  const heures = construireCreneaux(d).map((c) => c.heure);
  const lignes: [string, string][] = [
    ["Équipes", `${d.equipes.length}`],
    [
      "Poules",
      d.poules.length > 0
        ? d.poules.map((p) => `${p.nom} (${p.equipeIds.length} équipes)`).join(", ")
        : "pas encore tirées",
    ],
    ["Qualifiés pour le tableau", t.nbQualifies ? `${t.nbQualifies}` : "non défini"],
    ["Terrains utilisés", d.terrains.length > 0 ? d.terrains.map((c) => c.nom).join(", ") : "aucun terrain sélectionné"],
    ["Premier match", heures.length > 0 ? heures[0] : "calendrier non généré"],
  ];
  if (t.genre) lignes.push(["Genre", majuscule(t.genre)]);
  if (t.niveau) lignes.push(["Niveau", t.niveau]);

  for (const [titre, valeur] of lignes) {
    r.texte(MARGE, r.y - 11, titre, { taille: 10.5, gras: true });
    const l = r.retourALaLigne(valeur, r.largeurUtile - 170, 10.5);
    l.forEach((txt, i) => r.texte(MARGE + 170, r.y - 11 - i * 13, txt, { taille: 10.5 }));
    r.y -= Math.max(1, l.length) * 13 + 5;
  }

  r.y -= 14;
  r.texte(MARGE, r.y - 11, "Format de match", { taille: 12, gras: true });
  r.y -= 20;
  const formats: [string, string][] = [["Format par défaut", resumerFormat(t.formatDefaut)]];
  for (const phase of PHASES_FORMAT) {
    const f = t.formatsParPhase[phase];
    if (f) formats.push([LIBELLES_PHASES[phase], resumerFormat(f)]);
  }
  for (const [titre, texte] of formats) {
    r.texte(MARGE, r.y - 10, titre, { taille: 10, gras: true });
    r.y -= 14;
    const l = r.retourALaLigne(`${texte}.`, r.largeurUtile - 12, 10);
    l.forEach((txt, i) => r.texte(MARGE + 12, r.y - 10 - i * 13, txt, { taille: 10 }));
    r.y -= l.length * 13 + 6;
  }

  r.y -= 8;
  r.texte(MARGE, r.y - 11, "Départage des égalités en poule", { taille: 12, gras: true });
  r.y -= 20;
  for (const l of r.retourALaLigne(libelleCriteres(d), r.largeurUtile - 12, 10)) {
    r.texte(MARGE + 12, r.y - 10, l, { taille: 10 });
    r.y -= 13;
  }

  r.texte(MARGE, r.bas + 6, `Document édité le ${dateHeureParis(maintenant)} (heure de Paris)`, { taille: 8, gris: 0.4 });
}

// ── 2. Poules ───────────────────────────────────────────────────────────

function poules(r: Rendu, d: DonneesTournoi): void {
  r.debutSection("Composition des poules");
  if (d.poules.length === 0) {
    r.texte(MARGE, r.y - 12, "Les poules n'ont pas encore été tirées.", { taille: 11 });
    return;
  }
  const colN = 24;
  const colJ = (r.largeurUtile - colN) / 2;

  for (const p of d.poules) {
    r.assurerPlace(70, "Composition des poules (suite)");
    r.texte(MARGE, r.y - 13, `Poule ${p.nom}`, { taille: 13, gras: true });
    r.texte(MARGE + 80, r.y - 13, `${p.equipeIds.length} équipes`, { taille: 9, gris: 0.4 });
    r.y -= 20;
    r.cellule(MARGE, r.y, colN, 16, "N°", { gras: true, fond: FOND_ENTETE, align: "centre" });
    r.cellule(MARGE + colN, r.y, colJ, 16, "Joueur 1", { gras: true, fond: FOND_ENTETE });
    r.cellule(MARGE + colN + colJ, r.y, colJ, 16, "Joueur 2", { gras: true, fond: FOND_ENTETE });
    r.y -= 16;
    p.equipeIds.forEach((id, i) => {
      r.assurerPlace(22, `Poule ${p.nom} (suite)`);
      const e = d.equipes.find((x) => x.id === id);
      const [j1, j2] = e && e.joueurs.length >= 2 ? e.joueurs : [e?.nom ?? "?", ""];
      r.cellule(MARGE, r.y, colN, 20, `${i + 1}`, { align: "centre", taille: 9 });
      r.cellule(MARGE + colN, r.y, colJ, 20, j1, { taille: 9.5 });
      r.cellule(MARGE + colN + colJ, r.y, colJ, 20, j2, { taille: 9.5 });
      r.y -= 20;
    });
    r.y -= 16;
  }
}

// ── 3. Calendrier ───────────────────────────────────────────────────────

function calendrier(r: Rendu, d: DonneesTournoi): void {
  r.debutSection("Calendrier des matchs");
  const creneaux = construireCreneaux(d);
  if (creneaux.length === 0) {
    r.texte(MARGE, r.y - 12, "Le calendrier n'a pas encore été généré.", { taille: 11 });
    return;
  }

  const colHeure = 46;
  const colRepos = 118;
  const nbT = Math.max(1, d.terrains.length);
  const colT = (r.largeurUtile - colHeure - colRepos) / nbT;

  for (const c of creneaux) {
    const lignesCellule = (texte: string) => r.hauteurTexte(texte, colT - 6, 7.5);
    const hCorps = Math.max(
      34,
      ...d.terrains.map((t) => {
        const cell = c.cellules.find((x) => x.courtId === t.id);
        return cell ? lignesCellule(`${cell.etiquette}`) + lignesCellule(cell.equipeA) + lignesCellule("vs") + lignesCellule(cell.equipeB) + 6 : 0;
      }),
      c.repos.length > 0 ? r.hauteurTexte(c.repos.join(" ; "), colRepos - 6, 7.5) + 6 : 0,
    );
    r.assurerPlace(18 + hCorps + 10, "Calendrier des matchs (suite)");

    r.cellule(MARGE, r.y, colHeure, 16, "Heure", { gras: true, fond: FOND_ENTETE, align: "centre", taille: 8 });
    d.terrains.forEach((t, i) =>
      r.cellule(MARGE + colHeure + i * colT, r.y, colT, 16, t.nom, { gras: true, fond: FOND_ENTETE, taille: 8 }),
    );
    r.cellule(MARGE + colHeure + nbT * colT, r.y, colRepos, 16, "Repos", { gras: true, fond: FOND_ENTETE, taille: 8 });
    r.y -= 16;

    r.cellule(MARGE, r.y, colHeure, hCorps, c.heure, { gras: true, taille: 11, align: "centre" });
    d.terrains.forEach((t, i) => {
      const x = MARGE + colHeure + i * colT;
      const cell = c.cellules.find((z) => z.courtId === t.id);
      r.cellule(x, r.y, colT, hCorps, "", {});
      if (!cell) return;
      let yy = r.y - 3;
      for (const [texte, gras, gris] of [
        [cell.etiquette, true, 0.35],
        [cell.equipeA, false, 0],
        ["contre", false, 0.45],
        [cell.equipeB, false, 0],
      ] as [string, boolean, number][]) {
        const l = r.retourALaLigne(texte, colT - 6, 7.5, gras);
        for (const txt of l) {
          r.texte(x + 3, yy - 7.5, txt, { taille: 7.5, gras, gris });
          yy -= 9.4;
        }
      }
    });
    r.cellule(MARGE + colHeure + nbT * colT, r.y, colRepos, hCorps, c.repos.join(" ; "), { taille: 7.5 });
    r.y -= hCorps + 10;
  }
}

// ── 4. Feuilles de score ────────────────────────────────────────────────

function feuillesDeScore(r: Rendu, d: DonneesTournoi): void {
  r.debutSection("Feuilles de score", "paysage");
  const libelles = libellesPhaseFinale(d);
  const groupes = groupesFeuilles(d);
  if (groupes.length === 0) {
    r.texte(MARGE, r.y - 12, "Aucun match à afficher : tirez les poules et générez le calendrier.", { taille: 11 });
    return;
  }

  const pied = (format: (typeof groupes)[number]["format"]) => {
    const l1 = `Départage en poule, dans l'ordre : ${libelleCriteres(d)}`;
    const l2 = rappelBuzzer(format);
    r.trait(MARGE, r.bas + 26, r.largeur - MARGE, r.bas + 26, 0.5, 0.4);
    r.texte(MARGE, r.bas + 15, l1, { taille: 7.5, gris: 0.2 });
    if (l2) r.texte(MARGE, r.bas + 5, l2, { taille: 7.5, gris: 0.2 });
  };

  for (const g of groupes) {
    const cols = colonnesScore(g.format);
    const nbCases = cols.length * 2;
    const caseL = nbCases > 8 ? 22 : 30;
    const colN = 24;
    const colInfo = 76;
    const colVainqueur = 56;
    const largeurNoms = (r.largeurUtile - colN - colInfo - colVainqueur - nbCases * caseL) / 2;
    const hLigne = 30;

    const enTete = (suite: boolean) => {
      r.texte(MARGE, r.y - 12, `${g.titre}${suite ? " (suite)" : ""}`, { taille: 12, gras: true });
      r.texte(MARGE + r.largeurTexte(g.titre, 12, true) + 12, r.y - 12, g.resume, { taille: 7.5, gris: 0.35 });
      r.y -= 18;
      const h1 = 14;
      const h2 = 12;
      let x = MARGE;
      const bloc = (w: number, texte: string) => {
        r.cellule(x, r.y, w, h1 + h2, texte, { gras: true, fond: FOND_ENTETE, taille: 7.5, align: "centre" });
        x += w;
      };
      bloc(colN, "N°");
      bloc(colInfo, "Heure / terrain");
      bloc(largeurNoms, "Équipe A");
      bloc(largeurNoms, "Équipe B");
      for (const c of cols) {
        r.cellule(x, r.y, 2 * caseL, h1, c.titre, { gras: true, fond: FOND_ENTETE, taille: 7.5, align: "centre" });
        r.cellule(x, r.y - h1, caseL, h2, "A", { fond: FOND_ENTETE, taille: 7, align: "centre" });
        r.cellule(x + caseL, r.y - h1, caseL, h2, "B", { fond: FOND_ENTETE, taille: 7, align: "centre" });
        x += 2 * caseL;
      }
      bloc(colVainqueur, "Vainqueur");
      r.y -= h1 + h2;
    };

    r.assurerPlace(18 + 26 + hLigne + 40);
    enTete(false);

    g.matchs.forEach((m, i) => {
      if (r.espaceRestant < hLigne + 34) {
        pied(g.format);
        r.nouvellePage();
        enTete(true);
      }
      const terrain = d.terrains.find((t) => t.id === m.courtId)?.nom ?? "";
      const info = [m.debut ? formatHeureParis(m.debut) : "", terrain].filter(Boolean).join(" - ");
      const etiquette = m.phase === "poule" ? "" : `${etiquetteMatch(d, m, libelles)}. `;
      let x = MARGE;
      const bloc = (w: number, texte: string, o: { taille?: number; align?: "centre" } = {}) => {
        r.cellule(x, r.y, w, hLigne, texte, { taille: o.taille ?? 7.5, align: o.align });
        x += w;
      };
      bloc(colN, `${i + 1}`, { align: "centre" });
      bloc(colInfo, info || "-");
      bloc(largeurNoms, `${m.phase === "poule" ? `${etiquetteMatch(d, m, libelles)} : ` : etiquette}${coteMatch(d, m, "a", libelles)}`);
      bloc(largeurNoms, coteMatch(d, m, "b", libelles));
      for (let k = 0; k < nbCases; k++) bloc(caseL, "");
      bloc(colVainqueur, "");
      r.y -= hLigne;
    });
    pied(g.format);
    r.y = r.bas; // la phase suivante repart sur une nouvelle page pour garder son pied
    if (g !== groupes[groupes.length - 1]) r.nouvellePage();
  }
}

// ── 5. Grilles de classement ────────────────────────────────────────────

function grillesClassement(r: Rendu, d: DonneesTournoi): void {
  r.debutSection("Grilles de classement des poules");
  if (d.poules.length === 0) {
    r.texte(MARGE, r.y - 12, "Les poules n'ont pas encore été tirées.", { taille: 11 });
    return;
  }
  const cols = [
    { titre: "Victoires", l: 58 },
    { titre: "Jeux gagnés", l: 66 },
    { titre: "Jeux perdus", l: 66 },
    { titre: "Différence", l: 66 },
    { titre: "Rang", l: 44 },
  ];
  const colEquipe = r.largeurUtile - cols.reduce((s, c) => s + c.l, 0);
  const hLigne = 28;

  for (const p of d.poules) {
    r.assurerPlace(40 + (p.equipeIds.length + 1) * hLigne, "Grilles de classement (suite)");
    r.texte(MARGE, r.y - 13, `Poule ${p.nom}`, { taille: 13, gras: true });
    r.y -= 20;
    let x = MARGE;
    r.cellule(x, r.y, colEquipe, 20, "Équipe", { gras: true, fond: FOND_ENTETE });
    x += colEquipe;
    for (const c of cols) {
      r.cellule(x, r.y, c.l, 20, c.titre, { gras: true, fond: FOND_ENTETE, taille: 7.5, align: "centre" });
      x += c.l;
    }
    r.y -= 20;
    for (const id of p.equipeIds) {
      x = MARGE;
      r.cellule(x, r.y, colEquipe, hLigne, nomEquipe(d, id) ?? "?", { taille: 8.5 });
      x += colEquipe;
      for (const c of cols) {
        r.cellule(x, r.y, c.l, hLigne, "");
        x += c.l;
      }
      r.y -= hLigne;
    }
    r.y -= 20;
  }
  r.texte(MARGE, Math.max(r.bas + 6, r.y - 10), `Départage en cas d'égalité : ${libelleCriteres(d)}`, { taille: 8, gris: 0.3 });
}

// ── 6. Tableau final ────────────────────────────────────────────────────

function tableauFinalVierge(r: Rendu, d: DonneesTournoi): void {
  r.debutSection("Tableau final", "paysage");
  const taille = tailleDuTableau(d);
  if (taille === 0) {
    r.texte(MARGE, r.y - 12, "Pas de tableau final : une seule poule, le classement de poule est le classement final.", { taille: 11 });
    return;
  }
  r.texte(MARGE, r.y - 10, `${taille} équipes qualifiées`, { taille: 10, gris: 0.35 });
  r.y -= 14;

  const reserve = taille >= 4 ? 64 : 0;
  dessinerArbre(r, taille, { x: MARGE, haut: r.y, largeur: r.largeurUtile, hauteur: r.y - r.bas - reserve });

  if (taille >= 4) {
    const aCinquieme = d.matchs.some((m) => m.phase === "classement_5e");
    const largeur = 200;
    const haut = r.bas + 50;
    dessinerBoite(r, { x: MARGE, haut, largeur, hauteur: 46 }, { titre: "Match pour la 3e place", lignes: [{ texte: "" }, { texte: "" }] });
    if (aCinquieme) {
      dessinerBoite(r, { x: MARGE + largeur + 30, haut, largeur, hauteur: 46 }, { titre: "Match pour la 5e place", lignes: [{ texte: "" }, { texte: "" }] });
    }
  }
}

// ── Assemblage ──────────────────────────────────────────────────────────

export async function genererDossierOrganisation(d: DonneesTournoi, maintenant: Date): Promise<DocumentPdf> {
  const r = await Rendu.creer(`Dossier d'organisation - ${d.tournoi.nom}`, `Dossier d'organisation - ${d.tournoi.nom}`);
  couverture(r, d, maintenant);
  poules(r, d);
  calendrier(r, d);
  feuillesDeScore(r, d);
  grillesClassement(r, d);
  tableauFinalVierge(r, d);
  const bytes = await r.finaliser();
  return { bytes, sections: r.sections, nbPages: r.doc.getPageCount(), journal: r.journal };
}
