import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emailParMake, envoyeursReels } from "@/lib/rappels/envoi";

const reponse = (corps: string, status = 200) => new Response(corps, { status });

describe("envoi d'e-mail par Make", () => {
  beforeEach(() => {
    vi.stubEnv("MAKE_WEBHOOK_URL", "https://hook.eu1.make.com/abc");
    vi.stubEnv("MAKE_WEBHOOK_SECRET", "s3cret");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("envoie destinataire, sujet, texte et pièces jointes avec le secret en en-tête", async () => {
    const fetchMock = vi.fn(async () => reponse('{"ok":true}'));
    vi.stubGlobal("fetch", fetchMock);
    const r = await emailParMake("ana@x.fr", "Rappel", "À 14h", [{ nom: "poules.pdf", url: "https://x/p.pdf" }]);
    expect(r).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://hook.eu1.make.com/abc");
    expect((init.headers as Record<string, string>)["x-padelmeet-secret"]).toBe("s3cret");
    expect(JSON.parse(init.body as string)).toEqual({
      secret: "s3cret",
      destinataire: "ana@x.fr",
      sujet: "Rappel",
      texte: "À 14h",
      pieces_jointes: [{ nom: "poules.pdf", url: "https://x/p.pdf" }],
    });
  });

  it("sans pièce jointe, la liste est vide", async () => {
    const fetchMock = vi.fn(async () => reponse('{"ok":true}'));
    vi.stubGlobal("fetch", fetchMock);
    expect(await emailParMake("a@x.fr", "S", "T")).toEqual({ ok: true });
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string).pieces_jointes).toEqual([]);
  });

  it("une réponse « ok: false » du scénario (Gmail a refusé) est un échec", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => reponse('{"ok":false,"error":"quota Gmail"}')));
    const r = await emailParMake("a@x.fr", "S", "T");
    expect(r).toEqual({ ok: false, error: expect.stringContaining("quota Gmail") });
  });

  it("« Accepted » (scénario désactivé, message mis en file d'attente) est un échec, pas un envoi", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => reponse("Accepted")));
    const r = await emailParMake("a@x.fr", "S", "T");
    expect(r).toEqual({ ok: false, error: expect.stringContaining("file d'attente") });
  });

  it("un statut HTTP d'erreur est un échec", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => reponse("scenario inactif", 410)));
    const r = await emailParMake("a@x.fr", "S", "T");
    expect(r).toEqual({ ok: false, error: expect.stringContaining("410") });
  });

  it("une panne réseau ne lève pas", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("réseau coupé"); }));
    expect(await emailParMake("a@x.fr", "S", "T")).toEqual({ ok: false, error: "réseau coupé" });
  });

  it("sans configuration : échec explicite, aucun appel réseau", async () => {
    vi.stubEnv("MAKE_WEBHOOK_URL", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const r = await emailParMake("a@x.fr", "S", "T");
    expect(r).toEqual({ ok: false, error: expect.stringContaining("MAKE_WEBHOOK_URL") });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("choix du fournisseur d'e-mail", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("EMAIL_FOURNISSEUR=make passe par Make, pas par Resend", async () => {
    vi.stubEnv("EMAIL_FOURNISSEUR", "make");
    vi.stubEnv("MAKE_WEBHOOK_URL", "https://hook.eu1.make.com/abc");
    vi.stubEnv("MAKE_WEBHOOK_SECRET", "s");
    vi.stubEnv("RESEND_API_KEY", "re_x");
    vi.stubEnv("RESEND_FROM", "a@b.fr");
    const fetchMock = vi.fn(async () => reponse('{"ok":true}'));
    vi.stubGlobal("fetch", fetchMock);
    await envoyeursReels.email("a@x.fr", "S", "T");
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe("https://hook.eu1.make.com/abc");
  });

  it("par défaut (variable absente), Resend reste le fournisseur, pièces jointes comprises", async () => {
    vi.stubEnv("EMAIL_FOURNISSEUR", "");
    vi.stubEnv("RESEND_API_KEY", "re_x");
    vi.stubEnv("RESEND_FROM", "a@b.fr");
    const fetchMock = vi.fn(async () => reponse("{}"));
    vi.stubGlobal("fetch", fetchMock);
    await envoyeursReels.email("a@x.fr", "S", "T", [{ nom: "p.pdf", url: "https://x/p.pdf" }]);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(JSON.parse(init.body as string).attachments).toEqual([{ filename: "p.pdf", path: "https://x/p.pdf" }]);
  });
});
