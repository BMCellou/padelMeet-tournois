// Primitives de dessin pour les documents PDF A4 (pdf-lib, 100 % local).
// Noir et nuances de gris uniquement : le document doit rester lisible
// imprimé en noir et blanc. Polices standard (Helvetica) : aucune
// ressource externe, accents français compris (encodage WinAnsi).

import { PDFDocument, StandardFonts, grayscale, PageSizes, type PDFFont, type PDFPage } from "pdf-lib";

export type Orientation = "portrait" | "paysage";

export const MARGE = 36;
const PIED = 24;

const REMPLACEMENTS: Record<string, string> = {
  "’": "'",
  "‘": "'",
  " ": " ",
  " ": " ",
  "‑": "-",
  "→": "->",
  "≤": "<=",
  "≥": ">=",
};

export interface OptionsTexte {
  taille?: number;
  gras?: boolean;
  /** 0 = noir, 1 = blanc. */
  gris?: number;
  align?: "gauche" | "centre" | "droite";
}

export interface OptionsCellule extends OptionsTexte {
  bordure?: boolean;
  /** Fond en niveau de gris (0 noir … 1 blanc). */
  fond?: number;
  epaisseur?: number;
}

export interface SectionRendue {
  titre: string;
  pageDebut: number;
}

export class Rendu {
  readonly sections: SectionRendue[] = [];
  /** Tout le texte écrit, page par page (sert aux tests et au contrôle du contenu). */
  readonly journal: { page: number; texte: string }[] = [];
  page!: PDFPage;
  /** Curseur vertical : bord haut de la zone encore libre. */
  y = 0;
  private orientation: Orientation = "portrait";
  private lesEncodables: Set<number>;

  private constructor(
    readonly doc: PDFDocument,
    readonly normal: PDFFont,
    readonly gras: PDFFont,
    private readonly pied: string,
  ) {
    this.lesEncodables = new Set(normal.getCharacterSet());
  }

  static async creer(titre: string, pied: string): Promise<Rendu> {
    const doc = await PDFDocument.create();
    doc.setTitle(titre);
    doc.setLanguage("fr-FR");
    doc.setProducer("PadelMeet Tournois");
    doc.setCreator("PadelMeet Tournois");
    const normal = await doc.embedFont(StandardFonts.Helvetica);
    const gras = await doc.embedFont(StandardFonts.HelveticaBold);
    return new Rendu(doc, normal, gras, pied);
  }

  get largeur(): number {
    return this.page.getWidth();
  }
  get hauteur(): number {
    return this.page.getHeight();
  }
  get largeurUtile(): number {
    return this.largeur - 2 * MARGE;
  }
  get bas(): number {
    return MARGE + PIED;
  }
  get espaceRestant(): number {
    return this.y - this.bas;
  }
  get numeroPage(): number {
    return this.doc.getPageCount();
  }

  nettoyer(texte: string): string {
    let sortie = "";
    for (const c of texte.normalize("NFC")) {
      const r = REMPLACEMENTS[c];
      if (r !== undefined) sortie += r;
      else if (c === "\n") sortie += " ";
      else sortie += this.lesEncodables.has(c.codePointAt(0)!) ? c : "?";
    }
    return sortie;
  }

  police(gras?: boolean): PDFFont {
    return gras ? this.gras : this.normal;
  }

  largeurTexte(texte: string, taille: number, gras?: boolean): number {
    return this.police(gras).widthOfTextAtSize(this.nettoyer(texte), taille);
  }

  /** Découpe `texte` en lignes de largeur ≤ `largeurMax`. Les mots trop longs sont coupés. */
  retourALaLigne(texte: string, largeurMax: number, taille: number, gras?: boolean): string[] {
    const mots = this.nettoyer(texte).split(/\s+/).filter(Boolean);
    const lignes: string[] = [];
    let courante = "";
    const f = this.police(gras);
    const tient = (s: string) => f.widthOfTextAtSize(s, taille) <= largeurMax;
    for (let mot of mots) {
      while (!tient(mot) && mot.length > 1) {
        let n = mot.length - 1;
        while (n > 1 && !tient(mot.slice(0, n))) n--;
        if (courante) {
          lignes.push(courante);
          courante = "";
        }
        lignes.push(mot.slice(0, n));
        mot = mot.slice(n);
      }
      const essai = courante ? `${courante} ${mot}` : mot;
      if (tient(essai)) courante = essai;
      else {
        if (courante) lignes.push(courante);
        courante = mot;
      }
    }
    if (courante) lignes.push(courante);
    return lignes.length > 0 ? lignes : [""];
  }

  hauteurTexte(texte: string, largeurMax: number, taille: number, gras?: boolean): number {
    return this.retourALaLigne(texte, largeurMax, taille, gras).length * taille * 1.25;
  }

  // ── Pages ────────────────────────────────────────────────────────────

  nouvellePage(orientation: Orientation = this.orientation): PDFPage {
    const [l, h] = PageSizes.A4;
    this.orientation = orientation;
    this.page = this.doc.addPage(orientation === "portrait" ? [l, h] : [h, l]);
    this.y = this.hauteur - MARGE;
    return this.page;
  }

  /** Commence une section sur une nouvelle page, avec son titre. */
  debutSection(titre: string, orientation: Orientation = "portrait"): void {
    this.nouvellePage(orientation);
    this.sections.push({ titre, pageDebut: this.numeroPage });
    this.texte(MARGE, this.y - 18, titre, { taille: 18, gras: true });
    this.trait(MARGE, this.y - 24, this.largeur - MARGE, this.y - 24, 1.2);
    this.y -= 40;
  }

  /** Saute à une nouvelle page (même orientation) si `hauteur` n'y tient plus ; rappelle le titre en continuation. */
  assurerPlace(hauteur: number, suite?: string): void {
    if (this.espaceRestant >= hauteur) return;
    this.nouvellePage();
    if (suite) {
      this.texte(MARGE, this.y - 10, suite, { taille: 9, gras: true, gris: 0.35 });
      this.y -= 22;
    }
  }

  // ── Dessin ───────────────────────────────────────────────────────────

  /** Écrit une ligne ; `y` est la ligne de base. Retourne la largeur écrite. */
  texte(x: number, y: number, texte: string, o: OptionsTexte = {}): number {
    const taille = o.taille ?? 10;
    const t = this.nettoyer(texte);
    const f = this.police(o.gras);
    const w = f.widthOfTextAtSize(t, taille);
    this.journal.push({ page: this.doc.getPages().indexOf(this.page) + 1, texte: t });
    const xx = o.align === "centre" ? x - w / 2 : o.align === "droite" ? x - w : x;
    this.page.drawText(t, { x: xx, y, size: taille, font: f, color: grayscale(o.gris ?? 0) });
    return w;
  }

  trait(x1: number, y1: number, x2: number, y2: number, epaisseur = 0.8, gris = 0): void {
    this.page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: epaisseur, color: grayscale(gris) });
  }

  rectangle(x: number, haut: number, largeur: number, hauteur: number, epaisseur = 0.8, fond?: number): void {
    this.page.drawRectangle({
      x,
      y: haut - hauteur,
      width: largeur,
      height: hauteur,
      borderWidth: epaisseur,
      borderColor: grayscale(0),
      color: fond === undefined ? undefined : grayscale(fond),
    });
  }

  /**
   * Cellule : cadre + texte aligné en haut, coupé si la hauteur ne suffit pas.
   * `haut` est le bord haut de la cellule.
   */
  cellule(x: number, haut: number, largeur: number, hauteur: number, texte: string, o: OptionsCellule = {}): void {
    const taille = o.taille ?? 8;
    if (o.bordure !== false || o.fond !== undefined) {
      this.page.drawRectangle({
        x,
        y: haut - hauteur,
        width: largeur,
        height: hauteur,
        borderWidth: o.bordure === false ? 0 : (o.epaisseur ?? 0.6),
        borderColor: grayscale(0),
        color: o.fond === undefined ? undefined : grayscale(o.fond),
      });
    }
    if (!texte) return;
    const pas = taille * 1.25;
    const lignes = this.retourALaLigne(texte, largeur - 6, taille, o.gras);
    const maxLignes = Math.max(1, Math.floor((hauteur - 4) / pas));
    const visibles = lignes.slice(0, maxLignes);
    if (lignes.length > maxLignes) visibles[maxLignes - 1] = `${visibles[maxLignes - 1].slice(0, -1)}…`;
    visibles.forEach((l, i) => {
      const xx = o.align === "centre" ? x + largeur / 2 : o.align === "droite" ? x + largeur - 3 : x + 3;
      this.texte(xx, haut - 2 - taille - i * pas, l, { ...o, taille });
    });
  }

  // ── Fin ──────────────────────────────────────────────────────────────

  async finaliser(): Promise<Uint8Array> {
    const pages = this.doc.getPages();
    pages.forEach((p, i) => {
      this.page = p;
      const t = `${this.pied}  -  page ${i + 1} / ${pages.length}`;
      this.texte(p.getWidth() / 2, 18, t, { taille: 7.5, gris: 0.4, align: "centre" });
    });
    return this.doc.save();
  }
}
