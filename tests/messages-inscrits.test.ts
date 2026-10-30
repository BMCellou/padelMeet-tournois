import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PDFDocument } from "pdf-lib";
import { afterEach, describe, expect, it, vi } from "vitest";
import { genererPlanningParticipants } from "@/lib/pdf/dossier";
import {
  MARQUEUR_A_COMPLETER,
  construireDestinataires,
  executerParLots,
  modeleInfosPratiques,
  personnaliser,
  verifierMessage,
} from "@/lib/messages/inscrits";
import { emailParMake, emailParResend } from "@/lib/rappels/envoi";
import { construireDonneesTournoi } from "./helpers/donnees-pdf";

const joueur = (id: string, email: string | null = `${id}@x.fr`) => ({ id, prenom: `P${id}`, nom: `N${id}`, email });

describe("destinataires du message", () => {
  it("un joueur n'apparaît qu'une fois ; validé dès qu'une de ses inscriptions l'est", () => {
    const d = construireDestinataires(
      [
        { statut: "validee", joueurs: [joueur("a"), joueur("b")] },
        { statut: "en_attente", joueurs: [joueur("c"), joueur("d")] },
      ],
      [
        { statut: "valide", joueur: joueur("c") },
        { statut: "en_attente", joueur: joueur("e") },
        { statut: "en_attente", joueur: null },
      ],
    );
    expect(d.map((x) => [x.playerId, x.valide])).toEqual([
      ["a", true],
      ["b", true],
      ["c", true],
      ["d", false],
      ["e", false],
    ]);
  });

  it("une adresse absente ou invalide devient null (joueur non joignable)", () => {
    const d = construireDestinataires([{ statut: "validee", joueurs: [joueur("a", null), joueur("b", "pas-un-mail"), joueur("c", " c@x.fr ")] }], []);
    expect(d.map((x) => x.email)).toEqual([null, null, "c@x.fr"]);
  });
});

describe("texte du message", () => {
  it("remplace {prenom} et {nom} partout", () => {
    expect(personnaliser("Bonjour {prenom} {nom}, {prenom} !", { prenom: "Ana", nom: "Roy" })).toBe("Bonjour Ana Roy, Ana !");
  });

  it("refuse un message vide, trop long, ou dont le code d'accès n'a pas été complété", () => {
    expect(verifierMessage(" ", "x")).toBe("Le sujet est requis.");
    expect(verifierMessage("S", "  ")).toBe("Le message est vide.");
    expect(verifierMessage("S".repeat(151), "x")).toContain("sujet");
    expect(verifierMessage("S", "x".repeat(5001))).toContain("message");
    expect(verifierMessage("S", `Code : ${MARQUEUR_A_COMPLETER}`)).toContain("Remplace");
    expect(verifierMessage("S", "Code : 4821")).toBeNull();
  });

  it("le modèle pré-rempli contient les infos du tournoi et laisse le code à compléter (donc non envoyable tel quel)", () => {
    const m = modeleInfosPratiques({ nom: "Open", dateLisible: "samedi 16 janvier 2027", heure: "09:00", club: "Padel Club, Lyon" });
    expect(m.sujet).toBe("Infos pratiques — Open");
    expect(m.texte).toContain("samedi 16 janvier 2027, début à 09:00");
    expect(m.texte).toContain("Lieu : Padel Club, Lyon");
    expect(m.texte).toContain("Bonjour {prenom}");
    expect(verifierMessage(m.sujet, m.texte)).not.toBeNull();
    expect(verifierMessage(m.sujet, m.texte.replace(MARQUEUR_A_COMPLETER, "4821"))).toBeNull();
  });
});

describe("envoi par lots", () => {
  it("limite le nombre d'envois simultanés et garde l'ordre des résultats", async () => {
    let actifs = 0;
    let max = 0;
    const r = await executerParLots([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      actifs++;
      max = Math.max(max, actifs);
      await new Promise((ok) => setTimeout(ok, 5));
      actifs--;
      return n * 10;
    });
    expect(r).toEqual([10, 20, 30, 40, 50, 60, 70]);
    expect(max).toBe(3);
  });
});

describe("planning PDF pour les participants", async () => {
  const doc = await genererPlanningParticipants(construireDonneesTournoi(), new Date("2027-01-15T16:30:00.000Z"));
  const texte = doc.journal.map((l) => l.texte).join("\n");

  it("est un PDF valide ne contenant que le planning : poules et calendrier", async () => {
    expect(Buffer.from(doc.bytes.slice(0, 5)).toString()).toBe("%PDF-");
    expect((await PDFDocument.load(doc.bytes)).getPageCount()).toBe(doc.nbPages);
    expect(doc.sections.map((s) => s.titre)).toEqual(["Planning du tournoi", "Composition des poules", "Calendrier des matchs"]);
  });

  it("n'embarque ni feuilles de score ni grilles vierges", () => {
    expect(texte).not.toMatch(/Feuille de score|Grille|Tableau final/i);
    expect(texte).toMatch(/Poule A/);
  });
});

describe("pièce jointe générée par l'application (contenu en base64)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
  const piece = { nom: "planning.pdf", contenuBase64: "JVBERi0=" };

  it("Make reçoit nom + contenu_base64, sans url", async () => {
    vi.stubEnv("MAKE_WEBHOOK_URL", "https://hook.eu1.make.com/abc");
    vi.stubEnv("MAKE_WEBHOOK_SECRET", "s");
    const fetchMock = vi.fn(async () => new Response("Accepted"));
    vi.stubGlobal("fetch", fetchMock);
    await emailParMake("a@x.fr", "S", "T", [piece]);
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string).pieces_jointes).toEqual([{ nom: "planning.pdf", contenu_base64: "JVBERi0=" }]);
  });

  it("Resend reçoit filename + content", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_x");
    vi.stubEnv("RESEND_FROM", "a@b.fr");
    const fetchMock = vi.fn(async () => new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    await emailParResend("a@x.fr", "S", "T", [piece]);
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string).attachments).toEqual([{ filename: "planning.pdf", content: "JVBERi0=" }]);
  });
});

describe("branchement de l'action d'envoi", () => {
  const source = readFileSync(join(__dirname, "..", "src/app/admin/tournois/[id]/messages/actions.ts"), "utf-8");

  it("réservée aux administrateurs, avant toute lecture ou envoi", () => {
    expect(source.indexOf("estAdmin()")).toBeGreaterThan(-1);
    expect(source.indexOf("await estAdmin()")).toBeGreaterThan(-1);
    expect(source.indexOf("await estAdmin()")).toBeLessThan(source.indexOf("await chargerDestinatairesTournoi("));
    expect(source.indexOf("await estAdmin()")).toBeLessThan(source.indexOf("await envoyeursReels.email("));
  });

  it("les adresses viennent de la base, jamais du navigateur", () => {
    expect(source).toContain("chargerDestinatairesTournoi(supabase, tournamentId)");
    expect(source).not.toMatch(/z\.string\(\)\.email/);
  });

  it("l'essai ne part que vers l'administrateur connecté", () => {
    expect(source).toMatch(/essai[\s\S]{0,200}user\.email/);
  });
});
