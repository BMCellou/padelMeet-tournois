// « Dossier d'organisation » : couverture, poules, calendrier, feuilles de score,
// grilles de classement, arbre du tableau final. Seules les sections qui ont de la
// matière y figurent, et les matchs joués y sont remplis (scores, classements, tableau) :
// on peut donc l'imprimer à tout moment de la journée. A4, français, heures de Paris,
// aux couleurs de la marque.

import { resumerFormat } from "@/lib/engine/formatMatch";
import { CODE_FORMAT_PAR_DEFAUT, getFormat } from "@/lib/engine/formats";
import { formatHeureParis } from "@/lib/temps";
import { libelleGroupe } from "@/lib/tournoi/libelleGroupe";
import { contenuBoiteMatch, dessinerArbre, dessinerBoite } from "./arbre-dessin";
import { COULEURS } from "./marque";
import {
  coteMatch,
  colonnesScore,
  construireCreneaux,
  dateEnLettres,
  estJoue,
  etiquetteMatch,
  groupesFeuilles,
  libelleCriteres,
  libellesPhaseFinale,
  majuscule,
  nomEquipe,
  rappelBuzzer,
  tailleDuTableau,
  valeursCasesScore,
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

/** Bandeau de marque pleine largeur : logo, nature du document, nom du tournoi, club et date. */
function bandeauTitre(r: Rendu, d: DonneesTournoi, etiquette: string): void {
  const t = d.tournoi;
  const haut = r.hauteur;
  const titre = r.retourALaLigne(t.nom, r.largeurUtile, 26, true);
  const club = d.club ? `${d.club.nom}${d.club.ville ? ` - ${d.club.ville}` : ""}` : null;
  const yInfo = 92 + (titre.length - 1) * 32 + 26;
  const hauteur = yInfo + (club ? 17 : 0) + 26;

  r.aplat(0, haut, r.largeur, hauteur, COULEURS.marine);
  r.aplat(0, haut - hauteur + 5, r.largeur, 5, COULEURS.volt);
  r.aplat(MARGE, haut - 30, 20, 20, COULEURS.volt);
  r.texte(MARGE + 10, haut - 45, "P", { taille: 14, gras: true, couleur: COULEURS.marine, align: "centre" });
  const w = r.texte(MARGE + 28, haut - 44, "PadelMeet", { taille: 13, gras: true, couleur: COULEURS.blanc });
  r.texte(MARGE + 28 + w + 4, haut - 44, "Tournois", { taille: 13, couleur: COULEURS.brume });
  r.texte(r.largeur - MARGE, haut - 43, etiquette.toUpperCase(), { taille: 9, gras: true, couleur: COULEURS.volt, align: "droite" });

  titre.forEach((l, i) => r.texte(MARGE, haut - 92 - i * 32, l, { taille: 26, gras: true, couleur: COULEURS.blanc }));
  let y = haut - yInfo;
  if (club) {
    r.texte(MARGE, y, club, { taille: 12, couleur: COULEURS.blanc });
    y -= 17;
  }
  r.texte(MARGE, y, majuscule(dateEnLettres(t.date)), { taille: 12, couleur: COULEURS.volt });
  r.y = haut - hauteur - 26;
}

/** Titre d'une rubrique de la couverture : petit repère marine, texte en gras. */
function rubrique(r: Rendu, texte: string): void {
  r.aplat(MARGE, r.y - 1, 3, 13, COULEURS.marine);
  r.texte(MARGE + 9, r.y - 10, texte, { taille: 12, gras: true });
  r.y -= 22;
}

interface SectionDossier {
  titre: string;
  /** La section a de quoi être remplie. */
  prete: boolean;
  /** Le format du tournoi comporte cette section (sinon on n'en parle pas). */
  applicable: boolean;
  manque: string;
  dessiner: (r: Rendu, d: DonneesTournoi) => void;
}

function couverture(r: Rendu, d: DonneesTournoi, maintenant: Date, absentes: SectionDossier[]): void {
  r.nouvellePage("portrait");
  r.sections.push({ titre: "Dossier d'organisation", pageDebut: r.numeroPage });
  r.pagesSansBandeau.add(r.numeroPage);
  bandeauTitre(r, d, "Dossier d'organisation");
  const t = d.tournoi;

  const heures = construireCreneaux(d).map((c) => c.heure);
  const lignes: [string, string][] = [["Équipes", `${d.equipes.length}`]];
  if (d.poules.length > 0) {
    lignes.push(["Poules", d.poules.map((p) => `${libelleGroupe(p)} (${p.equipeIds.length} équipes)`).join(", ")]);
  }
  if (t.nbQualifies && getFormat(d.formatAnimation ?? CODE_FORMAT_PAR_DEFAUT).phaseFinale) {
    lignes.push(["Qualifiés pour le tableau", `${t.nbQualifies}`]);
  }
  if (d.terrains.length > 0) lignes.push(["Terrains utilisés", d.terrains.map((c) => c.nom).join(", ")]);
  if (heures.length > 0) lignes.push(["Premier match", heures[0]]);
  if (t.genre) lignes.push(["Genre", majuscule(t.genre)]);
  if (t.niveau) lignes.push(["Niveau", t.niveau]);

  for (const [titre, valeur] of lignes) {
    const l = r.retourALaLigne(valeur, r.largeurUtile - 170, 10.5);
    r.texte(MARGE, r.y - 11, titre, { taille: 10.5, gras: true, couleur: COULEURS.texteDiscret });
    l.forEach((txt, i) => r.texte(MARGE + 170, r.y - 11 - i * 13, txt, { taille: 10.5 }));
    const h = Math.max(1, l.length) * 13 + 5;
    r.trait(MARGE, r.y - h + 1, r.largeur - MARGE, r.y - h + 1, 0.4, COULEURS.brume);
    r.y -= h + 3;
  }

  r.y -= 14;
  rubrique(r, "Format de match");
  const formats: [string, string][] = [["Format par défaut", resumerFormat(t.formatDefaut)]];
  for (const { code, libelle } of getFormat(d.formatAnimation ?? CODE_FORMAT_PAR_DEFAUT).phases) {
    const f = t.formatsParPhase[code];
    if (f) formats.push([libelle, resumerFormat(f)]);
  }
  for (const [titre, texte] of formats) {
    r.texte(MARGE, r.y - 10, titre, { taille: 10, gras: true });
    r.y -= 14;
    const l = r.retourALaLigne(`${texte}.`, r.largeurUtile - 12, 10);
    l.forEach((txt, i) => r.texte(MARGE + 12, r.y - 10 - i * 13, txt, { taille: 10 }));
    r.y -= l.length * 13 + 6;
  }

  r.y -= 8;
  rubrique(r, "Départage des égalités en poule");
  for (const l of r.retourALaLigne(libelleCriteres(d), r.largeurUtile - 12, 10)) {
    r.texte(MARGE + 12, r.y - 10, l, { taille: 10 });
    r.y -= 13;
  }

  if (absentes.length > 0) {
    r.y -= 12;
    rubrique(r, "Pas encore dans ce dossier");
    for (const a of absentes) {
      for (const [i, l] of r.retourALaLigne(`${a.titre} : ${a.manque}.`, r.largeurUtile - 12, 9.5).entries()) {
        r.texte(MARGE + 12, r.y - 10, l, { taille: 9.5, gris: 0.2 });
        if (i === 0) r.texte(MARGE + 3, r.y - 10, "-", { taille: 9.5, gris: 0.2 });
        r.y -= 12;
      }
    }
    r.texte(MARGE + 12, r.y - 10, "Ces pages s'ajoutent d'elles-mêmes quand vous régénérez le dossier.", { taille: 8.5, gris: 0.4 });
  }

  r.texte(MARGE, r.bas + 6, `Document édité le ${dateHeureParis(maintenant)} (heure de Paris)`, { taille: 8, gris: 0.4 });
}

// ── 2. Poules ───────────────────────────────────────────────────────────

function poules(r: Rendu, d: DonneesTournoi, surPageCourante = false): void {
  r.debutSection("Composition des poules", "portrait", surPageCourante);
  const colN = 24;
  const colJ = (r.largeurUtile - colN) / 2;

  for (const p of d.poules) {
    r.assurerPlace(70, "Composition des poules (suite)");
    r.texte(MARGE, r.y - 13, libelleGroupe(p), { taille: 13, gras: true });
    r.texte(MARGE + r.largeurTexte(libelleGroupe(p), 13, true) + 10, r.y - 13, `${p.equipeIds.length} équipes`, { taille: 9, gris: 0.4 });
    r.y -= 20;
    r.cellule(MARGE, r.y, colN, 16, "N°", { entete: true, align: "centre" });
    r.cellule(MARGE + colN, r.y, colJ, 16, "Joueur 1", { entete: true });
    r.cellule(MARGE + colN + colJ, r.y, colJ, 16, "Joueur 2", { entete: true });
    r.y -= 16;
    p.equipeIds.forEach((id, i) => {
      r.assurerPlace(22, `${libelleGroupe(p)} (suite)`);
      const e = d.equipes.find((x) => x.id === id);
      const [j1, j2] = e && e.joueurs.length >= 2 ? e.joueurs : [e?.nom ?? "?", ""];
      const fond = i % 2 === 1 ? COULEURS.papier : undefined;
      r.cellule(MARGE, r.y, colN, 20, `${i + 1}`, { align: "centre", taille: 9, fond });
      r.cellule(MARGE + colN, r.y, colJ, 20, j1, { taille: 9.5, fond });
      r.cellule(MARGE + colN + colJ, r.y, colJ, 20, j2, { taille: 9.5, fond });
      r.y -= 20;
    });
    r.y -= 16;
  }
}

// ── 3. Calendrier ───────────────────────────────────────────────────────

function calendrier(r: Rendu, d: DonneesTournoi): void {
  r.debutSection("Calendrier des matchs");
  const creneaux = construireCreneaux(d);

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
        return cell
          ? lignesCellule(`${cell.etiquette}`) + lignesCellule(cell.equipeA) + lignesCellule("vs") + lignesCellule(cell.equipeB) + (cell.score ? lignesCellule(cell.score) : 0) + 9
          : 0;
      }),
      c.repos.length > 0 ? r.hauteurTexte(c.repos.join(" ; "), colRepos - 6, 7.5) + 6 : 0,
    );
    r.assurerPlace(18 + hCorps + 10, "Calendrier des matchs (suite)");

    r.cellule(MARGE, r.y, colHeure, 16, "Heure", { entete: true, align: "centre", taille: 8 });
    d.terrains.forEach((t, i) => r.cellule(MARGE + colHeure + i * colT, r.y, colT, 16, t.nom, { entete: true, taille: 8 }));
    r.cellule(MARGE + colHeure + nbT * colT, r.y, colRepos, 16, "Repos", { entete: true, taille: 8 });
    r.y -= 16;

    r.cellule(MARGE, r.y, colHeure, hCorps, c.heure, { gras: true, taille: 11, align: "centre", fond: COULEURS.papier });
    d.terrains.forEach((t, i) => {
      const x = MARGE + colHeure + i * colT;
      const cell = c.cellules.find((z) => z.courtId === t.id);
      r.cellule(x, r.y, colT, hCorps, "", {});
      if (!cell) return;
      let yy = r.y - 3;
      const lignes: [string, boolean, number][] = [
        [cell.etiquette, true, 0.35],
        [cell.equipeA, cell.vainqueur === "a", 0],
        ["contre", false, 0.45],
        [cell.equipeB, cell.vainqueur === "b", 0],
      ];
      if (cell.score) lignes.push([cell.score, true, 0.15]);
      for (const [texte, gras, gris] of lignes) {
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

  const pied = (format: (typeof groupes)[number]["format"]) => {
    const l1 = `Départage en poule, dans l'ordre : ${libelleCriteres(d)}`;
    const l2 = rappelBuzzer(format);
    r.trait(MARGE, r.bas + 26, r.largeur - MARGE, r.bas + 26, 0.5, COULEURS.traitClair);
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
        r.cellule(x, r.y, w, h1 + h2, texte, { entete: true, taille: 7.5, align: "centre" });
        x += w;
      };
      bloc(colN, "N°");
      bloc(colInfo, "Heure / terrain");
      bloc(largeurNoms, "Équipe A");
      bloc(largeurNoms, "Équipe B");
      for (const c of cols) {
        r.cellule(x, r.y, 2 * caseL, h1, c.titre, { entete: true, taille: 7.5, align: "centre" });
        r.cellule(x, r.y - h1, caseL, h2, "A", { entete: true, taille: 7, align: "centre" });
        r.cellule(x + caseL, r.y - h1, caseL, h2, "B", { entete: true, taille: 7, align: "centre" });
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
      const joue = estJoue(m);
      const terrain = d.terrains.find((t) => t.id === m.courtId)?.nom ?? "";
      const info = [m.debut ? formatHeureParis(m.debut) : "", terrain].filter(Boolean).join(" - ");
      const etiquette = m.phase === "poule" ? "" : `${etiquetteMatch(d, m, libelles)}. `;
      const valeurs = valeursCasesScore(cols, m);
      const fond = joue ? COULEURS.papier : undefined;
      let x = MARGE;
      const bloc = (w: number, texte: string, o: { taille?: number; align?: "centre"; gras?: boolean } = {}) => {
        r.cellule(x, r.y, w, hLigne, texte, { taille: o.taille ?? 7.5, align: o.align, gras: o.gras, fond });
        x += w;
      };
      bloc(colN, `${i + 1}`, { align: "centre" });
      bloc(colInfo, info || "-");
      bloc(largeurNoms, `${m.phase === "poule" ? `${etiquetteMatch(d, m, libelles)} : ` : etiquette}${coteMatch(d, m, "a", libelles)}`, { gras: joue && m.winnerId === m.teamAId });
      bloc(largeurNoms, coteMatch(d, m, "b", libelles), { gras: joue && m.winnerId === m.teamBId });
      for (let k = 0; k < nbCases; k++) bloc(caseL, valeurs[k], { align: "centre", taille: 10, gras: true });
      const vainqueur = joue && m.winnerId ? (m.winnerId === m.teamAId ? "Équipe A" : "Équipe B") : "";
      bloc(colVainqueur, vainqueur && m.statut === "forfait" ? `${vainqueur} (forfait)` : vainqueur, { gras: true });
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
    const matchsPoule = d.matchs.filter((m) => m.groupId === p.id && m.phase === "poule");
    const joues = matchsPoule.filter(estJoue).length;
    const lignesDe = (id: string) => (joues > 0 ? d.classements.find((c) => c.groupId === p.id && c.teamId === id) : undefined);
    // Une fois des matchs joués, la grille se lit dans l'ordre du classement.
    const ordre = joues > 0 ? [...p.equipeIds].sort((a, b) => (lignesDe(a)?.rang ?? 99) - (lignesDe(b)?.rang ?? 99)) : p.equipeIds;

    r.assurerPlace(40 + (p.equipeIds.length + 1) * hLigne, "Grilles de classement (suite)");
    r.texte(MARGE, r.y - 13, libelleGroupe(p), { taille: 13, gras: true });
    if (joues > 0 && joues < matchsPoule.length) {
      const restants = matchsPoule.length - joues;
      r.texte(MARGE + r.largeurTexte(libelleGroupe(p), 13, true) + 10, r.y - 13, `classement provisoire : ${restants} match${restants > 1 ? "s" : ""} à jouer`, { taille: 8.5, gris: 0.35 });
    }
    r.y -= 20;
    let x = MARGE;
    r.cellule(x, r.y, colEquipe, 20, "Équipe", { entete: true });
    x += colEquipe;
    for (const c of cols) {
      r.cellule(x, r.y, c.l, 20, c.titre, { entete: true, taille: 7.5, align: "centre" });
      x += c.l;
    }
    r.y -= 20;
    for (const id of ordre) {
      const l = lignesDe(id);
      const premier = !!l && l.rang === 1;
      const diff = l ? l.jeuxG - l.jeuxP : 0;
      const valeurs = l ? [`${l.v}`, `${l.jeuxG}`, `${l.jeuxP}`, `${diff > 0 ? "+" : ""}${diff}`, l.rang ? `${l.rang}` : ""] : cols.map(() => "");
      const fond = premier ? COULEURS.voltPale : undefined;
      x = MARGE;
      r.cellule(x, r.y, colEquipe, hLigne, nomEquipe(d, id) ?? "?", { taille: 8.5, gras: premier, fond });
      x += colEquipe;
      cols.forEach((c, i) => {
        r.cellule(x, r.y, c.l, hLigne, valeurs[i], { align: "centre", taille: 11, gras: true, fond });
        x += c.l;
      });
      r.y -= hLigne;
    }
    r.y -= 20;
  }
  r.texte(MARGE, Math.max(r.bas + 6, r.y - 10), `Départage en cas d'égalité : ${libelleCriteres(d)}`, { taille: 8, gris: 0.3 });
}

// ── 6. Tableau final ────────────────────────────────────────────────────

function tableauFinal(r: Rendu, d: DonneesTournoi): void {
  r.debutSection("Tableau final", "paysage");
  const taille = tailleDuTableau(d);
  const libelles = libellesPhaseFinale(d);
  const tableau = d.matchs.filter((m) => m.phase === "tableau");
  r.texte(MARGE, r.y - 10, `${taille} équipes qualifiées`, { taille: 10, gris: 0.35 });
  r.y -= 14;

  // Tableau pas encore créé (poules en cours) : arbre vierge, à compléter à la main au bord des terrains.
  const annexes = d.matchs
    .filter((m) => m.phase === "classement" || m.phase === "classement_5e")
    .sort((a, b) => (a.phase === "classement" ? -1 : 1) - (b.phase === "classement" ? -1 : 1));
  const avecPetiteFinale = annexes.length > 0 || (tableau.length === 0 && taille >= 4);
  const reserve = avecPetiteFinale ? 64 : 0;
  dessinerArbre(r, taille, { x: MARGE, haut: r.y, largeur: r.largeurUtile, hauteur: r.y - r.bas - reserve }, (tour, index) => {
    const m = tableau.find((x) => x.round === tour + 1 && x.bracketSlot === index);
    return m ? contenuBoiteMatch(d, m, libelles) : undefined;
  });
  const boite = (i: number) => ({ x: MARGE + i * 250, haut: r.bas + 56, largeur: 220, hauteur: 52 });
  if (annexes.length > 0) {
    annexes.forEach((m, i) => dessinerBoite(r, boite(i), contenuBoiteMatch(d, m, libelles)));
  } else if (avecPetiteFinale) {
    dessinerBoite(r, boite(0), { titre: "Match pour la 3e place", lignes: [{ texte: "" }, { texte: "" }] });
  }
}

// ── Assemblage ──────────────────────────────────────────────────────────

/** Les sections du dossier dans l'ordre, avec ce qu'il faut pour que chacune ait du contenu. */
function sectionsDuDossier(d: DonneesTournoi): SectionDossier[] {
  const format = getFormat(d.formatAnimation ?? CODE_FORMAT_PAR_DEFAUT);
  const aDesPoules = d.poules.length > 0;
  return [
    { titre: "Composition des poules", prete: aDesPoules, applicable: !!format.groupes, manque: "le tirage au sort n'est pas fait", dessiner: (r, x) => poules(r, x) },
    { titre: "Calendrier des matchs", prete: construireCreneaux(d).length > 0, applicable: true, manque: "le calendrier n'est pas généré", dessiner: calendrier },
    { titre: "Feuilles de score", prete: groupesFeuilles(d).length > 0, applicable: true, manque: "aucun match n'est créé", dessiner: feuillesDeScore },
    { titre: "Grilles de classement des poules", prete: aDesPoules, applicable: !!format.groupes, manque: "le tirage au sort n'est pas fait", dessiner: grillesClassement },
    {
      titre: "Tableau final",
      prete: tailleDuTableau(d) > 0,
      applicable: !!format.phaseFinale,
      manque: "il faut au moins 2 poules tirées",
      dessiner: tableauFinal,
    },
  ];
}

export async function genererDossierOrganisation(d: DonneesTournoi, maintenant: Date): Promise<DocumentPdf> {
  const r = await Rendu.creer(`Dossier d'organisation - ${d.tournoi.nom}`, `Dossier d'organisation - ${d.tournoi.nom}`);
  const sections = sectionsDuDossier(d).filter((s) => s.applicable);
  couverture(r, d, maintenant, sections.filter((s) => !s.prete));
  for (const s of sections.filter((x) => x.prete)) s.dessiner(r, d);
  const bytes = await r.finaliser();
  return { bytes, sections: r.sections, nbPages: r.doc.getPageCount(), journal: r.journal };
}

// ── Planning à destination des participants ─────────────────────────────

/** Titre, club, date, composition des poules et calendrier : sans feuilles de score ni grilles. */
export async function genererPlanningParticipants(d: DonneesTournoi, maintenant: Date): Promise<DocumentPdf> {
  const r = await Rendu.creer(`Planning - ${d.tournoi.nom}`, `Planning - ${d.tournoi.nom}`);
  r.nouvellePage("portrait");
  r.sections.push({ titre: "Planning du tournoi", pageDebut: r.numeroPage });
  r.pagesSansBandeau.add(r.numeroPage);
  bandeauTitre(r, d, "Planning du tournoi");
  r.texte(MARGE, r.y - 8, `Édité le ${dateHeureParis(maintenant)} (heure de Paris)`, { taille: 8, gris: 0.4 });
  r.y -= 12;

  if (d.poules.length > 0) poules(r, d, true);
  if (construireCreneaux(d).length > 0) calendrier(r, d);
  const bytes = await r.finaliser();
  return { bytes, sections: r.sections, nbPages: r.doc.getPageCount(), journal: r.journal };
}
