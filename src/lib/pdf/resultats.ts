// « Résultats » : classements de poule remplis, tableau final rempli,
// classement final. Document envoyé au club après le tournoi (A4, noir et blanc).

import { libelleSet } from "@/lib/engine/score";
import { calculerClassementFinalTableau, type StandingRow } from "@/lib/tournoi/classementFinalAffichage";
import { dessinerArbre, dessinerBoite, type ContenuBoite } from "./arbre-dessin";
import type { DocumentPdf } from "./dossier";
import {
  coteMatch,
  dateEnLettres,
  etiquetteMatch,
  libellesPhaseFinale,
  majuscule,
  nomEquipe,
  tailleDuTableau,
} from "./mise-en-page";
import { MARGE, Rendu } from "./outils";
import type { DonneesTournoi, MatchPdf } from "./types";

const FOND_ENTETE = 0.88;

function resumeScore(m: MatchPdf): string {
  if (m.statut === "forfait") return "Forfait";
  return m.sets.length === 0 ? "" : m.sets.map(libelleSet).join(", ");
}

function entete(r: Rendu, d: DonneesTournoi): void {
  const club = d.club ? `${d.club.nom}${d.club.ville ? ` - ${d.club.ville}` : ""}` : "";
  r.texte(MARGE, r.y - 11, [d.tournoi.nom, club].filter(Boolean).join("  -  "), { taille: 10.5, gras: true });
  r.texte(MARGE, r.y - 24, majuscule(dateEnLettres(d.tournoi.date)), { taille: 9, gris: 0.35 });
  r.y -= 36;
}

// ── 1. Classements de poule ─────────────────────────────────────────────

function classementsDePoule(r: Rendu, d: DonneesTournoi): void {
  r.debutSection("Résultats : classements de poule");
  entete(r, d);
  if (d.poules.length === 0) {
    r.texte(MARGE, r.y - 12, "Aucune poule.", { taille: 11 });
    return;
  }

  const cols = [
    { titre: "Rang", l: 34 },
    { titre: "Équipe", l: 0 },
    { titre: "J", l: 26 },
    { titre: "V", l: 26 },
    { titre: "D", l: 26 },
    { titre: "Sets", l: 46 },
    { titre: "Jeux G", l: 40 },
    { titre: "Jeux P", l: 40 },
    { titre: "Diff.", l: 40 },
  ];
  cols[1].l = r.largeurUtile - cols.reduce((s, c) => s + c.l, 0);

  for (const p of d.poules) {
    const lignes = d.classements
      .filter((c) => c.groupId === p.id)
      .sort((a, b) => (a.rang ?? 99) - (b.rang ?? 99));
    const matchs = d.matchs.filter(
      (m) => m.phase === "poule" && m.groupId === p.id && (m.statut === "valide" || m.statut === "forfait"),
    );
    r.assurerPlace(40 + (lignes.length + 1) * 18 + matchs.length * 11, "Résultats : classements de poule (suite)");

    r.texte(MARGE, r.y - 13, `Poule ${p.nom}`, { taille: 13, gras: true });
    r.y -= 20;
    let x = MARGE;
    for (const c of cols) {
      r.cellule(x, r.y, c.l, 17, c.titre, { gras: true, fond: FOND_ENTETE, taille: 8, align: c.titre === "Équipe" ? "gauche" : "centre" });
      x += c.l;
    }
    r.y -= 17;
    for (const l of lignes) {
      x = MARGE;
      const valeurs = [
        l.rang ? `${l.rang}` : "-",
        nomEquipe(d, l.teamId) ?? "?",
        `${l.joues}`,
        `${l.v}`,
        `${l.d}`,
        `${l.setsG}-${l.setsP}`,
        `${l.jeuxG}`,
        `${l.jeuxP}`,
        `${l.jeuxG - l.jeuxP > 0 ? "+" : ""}${l.jeuxG - l.jeuxP}`,
      ];
      cols.forEach((c, i) => {
        r.cellule(x, r.y, c.l, 18, valeurs[i], { taille: 8.5, gras: i === 0 || (i === 1 && l.rang === 1), align: i === 1 ? "gauche" : "centre" });
        x += c.l;
      });
      r.y -= 18;
    }

    r.y -= 6;
    for (const m of matchs) {
      const a = nomEquipe(d, m.teamAId) ?? "?";
      const b = nomEquipe(d, m.teamBId) ?? "?";
      const gagnantA = m.winnerId === m.teamAId;
      const largeurNom = (r.largeurUtile - 90) / 2;
      const taille = 7.5;
      const coupe = (t: string) => {
        let s = t;
        while (s.length > 3 && r.largeurTexte(s, taille) > largeurNom) s = s.slice(0, -1);
        return s === t ? t : `${s.slice(0, -1)}…`;
      };
      r.texte(MARGE, r.y - 8, coupe(a), { taille, gras: gagnantA });
      r.texte(MARGE + r.largeurUtile / 2, r.y - 8, resumeScore(m), { taille, align: "centre", gris: 0.2 });
      r.texte(MARGE + r.largeurUtile, r.y - 8, coupe(b), { taille, gras: !gagnantA && !!m.winnerId, align: "droite" });
      r.y -= 11;
    }
    r.y -= 16;
  }
}

// ── 2. Tableau final rempli ─────────────────────────────────────────────

function tableauRempli(r: Rendu, d: DonneesTournoi): void {
  r.debutSection("Résultats : tableau final", "paysage");
  entete(r, d);
  const taille = tailleDuTableau(d);
  const tableau = d.matchs.filter((m) => m.phase === "tableau");
  if (taille === 0 || tableau.length === 0) {
    r.texte(MARGE, r.y - 12, "Pas de tableau final pour ce tournoi.", { taille: 11 });
    return;
  }
  const libelles = libellesPhaseFinale(d);

  const contenuDe = (m: MatchPdf): ContenuBoite => {
    const gagnantA = m.winnerId !== null && m.winnerId === m.teamAId;
    const gagnantB = m.winnerId !== null && m.winnerId === m.teamBId;
    return {
      titre: etiquetteMatch(d, m, libelles),
      lignes: [
        { texte: coteMatch(d, m, "a", libelles), gras: gagnantA, gris: m.teamAId ? 0 : 0.45 },
        { texte: coteMatch(d, m, "b", libelles), gras: gagnantB, gris: m.teamBId ? 0 : 0.45 },
      ],
      score: resumeScore(m),
    };
  };

  const reserve = taille >= 4 ? 66 : 0;
  dessinerArbre(r, taille, { x: MARGE, haut: r.y, largeur: r.largeurUtile, hauteur: r.y - r.bas - reserve }, (tour, index) => {
    const m = tableau.find((x) => x.round === tour + 1 && x.bracketSlot === index);
    return m ? contenuDe(m) : undefined;
  });

  const annexes = d.matchs.filter((m) => m.phase === "classement" || m.phase === "classement_5e");
  annexes
    .sort((a, b) => (a.phase === "classement" ? -1 : 1) - (b.phase === "classement" ? -1 : 1))
    .forEach((m, i) => {
      dessinerBoite(r, { x: MARGE + i * 250, haut: r.bas + 56, largeur: 220, hauteur: 52 }, contenuDe(m));
    });
}

// ── 3. Classement final ─────────────────────────────────────────────────

function classementFinal(r: Rendu, d: DonneesTournoi): void {
  r.debutSection("Résultats : classement final");
  entete(r, d);

  let lignes: { rang: number; equipeNom: string }[] | null;
  if (d.poules.length === 1) {
    lignes = d.classements
      .filter((c) => c.rang !== null)
      .sort((a, b) => (a.rang ?? 0) - (b.rang ?? 0))
      .map((c) => ({ rang: c.rang!, equipeNom: nomEquipe(d, c.teamId) ?? "?" }));
  } else {
    const brut = (m: MatchPdf) => ({
      round: m.round,
      team_a_id: m.teamAId,
      team_b_id: m.teamBId,
      winner_id: m.winnerId,
      statut: m.statut,
      next_match_id: m.nextMatchId,
    });
    const standings = new Map<string, StandingRow>(
      d.classements.map((c) => [
        c.teamId,
        { team_id: c.teamId, joues: c.joues, v: c.v, ratio_sets: c.ratioSets, ratio_jeux: c.ratioJeux, rang: c.rang },
      ]),
    );
    lignes = calculerClassementFinalTableau(
      d.matchs.filter((m) => m.phase === "tableau").map(brut),
      d.matchs.filter((m) => m.phase === "classement").map(brut)[0] ?? null,
      d.matchs.filter((m) => m.phase === "classement_5e").map(brut)[0] ?? null,
      d.equipes.map((e) => e.id),
      standings,
      new Map(d.equipes.map((e) => [e.id, e.nom])),
    );
  }

  if (!lignes || lignes.length === 0) {
    r.texte(MARGE, r.y - 12, "Le classement final n'est pas disponible : la finale n'a pas été jouée.", { taille: 11 });
    return;
  }

  const colRang = 60;
  r.cellule(MARGE, r.y, colRang, 20, "Rang", { gras: true, fond: FOND_ENTETE, align: "centre" });
  r.cellule(MARGE + colRang, r.y, r.largeurUtile - colRang, 20, "Équipe", { gras: true, fond: FOND_ENTETE });
  r.y -= 20;
  for (const l of lignes) {
    r.assurerPlace(26, "Résultats : classement final (suite)");
    const exAequo = lignes.filter((x) => x.rang === l.rang).length > 1;
    r.cellule(MARGE, r.y, colRang, 24, exAequo ? `${l.rang} (ex æquo)` : `${l.rang}`, { gras: l.rang <= 3, align: "centre", taille: l.rang <= 3 ? 12 : 10 });
    r.cellule(MARGE + colRang, r.y, r.largeurUtile - colRang, 24, l.equipeNom, { gras: l.rang <= 3, taille: l.rang <= 3 ? 11 : 10 });
    r.y -= 24;
  }
}

export async function genererResultats(d: DonneesTournoi): Promise<DocumentPdf> {
  const r = await Rendu.creer(`Résultats - ${d.tournoi.nom}`, `Résultats - ${d.tournoi.nom}`);
  classementsDePoule(r, d);
  tableauRempli(r, d);
  classementFinal(r, d);
  const bytes = await r.finaliser();
  return { bytes, sections: r.sections, nbPages: r.doc.getPageCount(), journal: r.journal };
}
