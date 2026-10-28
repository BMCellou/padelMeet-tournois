import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { DELAI_ANNULATION_HEURES, formaterLimite, limiteAnnulation, verdictAnnulation } from "@/lib/inscriptions/annulation";
import {
  messageAnnulationOrganisateur,
  messageAnnulationPartenaire,
  messageNouvelleInscription,
} from "@/lib/inscriptions/messages";
import { emailsAdmins, notifierAdmins, notifierParticipant } from "@/lib/inscriptions/notifier";
import { heureLocaleVersISO } from "@/lib/temps";
import type { Envoyeurs } from "@/lib/rappels/envoi";

const debut = heureLocaleVersISO("2026-10-10", "09:00"); // 07:00Z (heure d'été)

describe("annulation d'une inscription : limite de 48 h avant le début", () => {
  it("la limite est le début − 48 h", () => {
    expect(DELAI_ANNULATION_HEURES).toBe(48);
    expect(limiteAnnulation(debut).toISOString()).toBe("2026-10-08T07:00:00.000Z");
  });

  it("possible à 49 h et à 1 ms avant la limite, refusé pile à la limite et après", () => {
    const limite = limiteAnnulation(debut);
    expect(verdictAnnulation("publie", debut, new Date(limite.getTime() - 3_600_000)).possible).toBe(true);
    expect(verdictAnnulation("publie", debut, new Date(limite.getTime() - 1)).possible).toBe(true);
    const pile = verdictAnnulation("publie", debut, limite);
    expect(pile).toMatchObject({ possible: false, raison: "delai_depasse" });
    expect(verdictAnnulation("publie", debut, new Date(limite.getTime() + 1)).possible).toBe(false);
    // la veille du tournoi, le jour même, après le début
    expect(verdictAnnulation("publie", debut, new Date("2026-10-09T09:00:00Z")).possible).toBe(false);
    expect(verdictAnnulation("publie", debut, new Date("2026-10-11T09:00:00Z")).possible).toBe(false);
  });

  it("le message de refus renvoie vers l'organisateur et cite 48 h", () => {
    const v = verdictAnnulation("publie", debut, new Date("2026-10-09T09:00:00Z"));
    expect(v.possible === false && v.message).toMatch(/48 h.*organisateur/);
  });

  it("jamais d'annulation si le tournoi n'est plus publié (brouillon, en cours, terminé)", () => {
    const loin = new Date("2026-01-01T00:00:00Z");
    for (const statut of ["brouillon", "en_cours", "termine"]) {
      expect(verdictAnnulation(statut, debut, loin)).toMatchObject({ possible: false, raison: "tournoi_non_ouvert" });
    }
  });

  it("48 heures réelles même quand le changement d'heure tombe entre les deux", () => {
    // Passage à l'heure d'hiver le dimanche 25 octobre 2026 : début lundi 26 à 09:00 (UTC+1) = 08:00Z.
    const lundi = heureLocaleVersISO("2026-10-26", "09:00");
    expect(lundi).toBe("2026-10-26T08:00:00.000Z");
    expect(limiteAnnulation(lundi).toISOString()).toBe("2026-10-24T08:00:00.000Z");
  });

  it("la limite s'affiche en heure de Paris", () => {
    expect(formaterLimite(limiteAnnulation(debut))).toBe("jeudi 8 octobre à 09:00");
  });
});

describe("e-mails d'inscription : textes", () => {
  const t = { nom: "Tournoi du 10", dateLisible: "samedi 10 octobre 2026" };

  it("nouvelle inscription solo et paire", () => {
    const solo = messageNouvelleInscription(t, { type: "solo", joueur: "Ana Roy" }, { occupees: 7, max: 16 }, "https://x/admin");
    expect(solo.sujet).toBe("Nouvelle inscription — Tournoi du 10");
    expect(solo.texte).toContain("Ana Roy s'est inscrit(e) seul(e)");
    expect(solo.texte).toContain("7 / 16 joueurs inscrits");
    expect(solo.texte).toContain("https://x/admin");

    const paire = messageNouvelleInscription(t, { type: "paire", joueur: "Ana Roy", partenaire: "Lou Max" }, { occupees: 8, max: null }, null);
    expect(paire.texte).toContain("en paire avec Lou Max");
    expect(paire.texte).toContain("pas de limite");
    expect(paire.texte).not.toContain("Gérer");
  });

  it("annulation : organisateur et partenaire", () => {
    expect(messageAnnulationOrganisateur(t, "Ana Roy", null, { occupees: 6, max: 16 }, null).texte).toContain("Ana Roy a annulé son inscription");
    expect(messageAnnulationOrganisateur(t, "Ana Roy", "Lou Max", { occupees: 6, max: 16 }, null).texte).toContain("sa paire (avec Lou Max)");
    expect(messageAnnulationPartenaire(t, "Ana Roy").texte).toContain("Ana Roy a annulé votre inscription en paire");
  });
});

describe("notification : un envoi raté ne casse jamais l'inscription", () => {
  const service = {
    from: () => ({ select: () => ({ eq: async () => ({ data: [{ user_id: "u1" }, { user_id: "u2" }, { user_id: "u3" }] }) }) }),
    auth: { admin: { getUserById: async (id: string) => ({ data: { user: { email: id === "u3" ? "pas-un-email" : `${id}@club.fr` } } }) } },
  } as never;
  const msg = { sujet: "S", texte: "T" };

  it("envoie à chaque administrateur disposant d'une adresse valide", async () => {
    expect(await emailsAdmins(service)).toEqual(["u1@club.fr", "u2@club.fr"]);
    const email = vi.fn<(to: string, sujet: string, texte: string) => Promise<{ ok: true }>>(async () => ({ ok: true }));
    await notifierAdmins(service, msg, { email, whatsappApi: vi.fn() } as unknown as Envoyeurs);
    expect(email.mock.calls.map((c) => c[0])).toEqual(["u1@club.fr", "u2@club.fr"]);
  });

  it("un échec d'envoi (service en panne) ne lève pas et n'empêche pas les autres envois", async () => {
    const erreur = vi.spyOn(console, "error").mockImplementation(() => {});
    const email = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, error: "503" })
      .mockResolvedValueOnce({ ok: true });
    await expect(notifierAdmins(service, msg, { email, whatsappApi: vi.fn() } as unknown as Envoyeurs)).resolves.toBeUndefined();
    expect(email).toHaveBeenCalledTimes(2);
    expect(erreur).toHaveBeenCalled();
    erreur.mockRestore();
  });

  it("une exception inattendue est attrapée", async () => {
    const erreur = vi.spyOn(console, "error").mockImplementation(() => {});
    const casse = { from: () => { throw new Error("base indisponible"); } } as never;
    await expect(notifierAdmins(casse, msg, { email: vi.fn(), whatsappApi: vi.fn() } as unknown as Envoyeurs)).resolves.toBeUndefined();
    erreur.mockRestore();
  });

  it("aucun administrateur joignable : aucun envoi ; partenaire sans e-mail valide : aucun envoi", async () => {
    const vide = { from: () => ({ select: () => ({ eq: async () => ({ data: [] }) }) }) } as never;
    const email = vi.fn(async () => ({ ok: true as const }));
    await notifierAdmins(vide, msg, { email, whatsappApi: vi.fn() } as unknown as Envoyeurs);
    await notifierParticipant("pas-un-email", msg, { email, whatsappApi: vi.fn() } as unknown as Envoyeurs);
    await notifierParticipant(null, msg, { email, whatsappApi: vi.fn() } as unknown as Envoyeurs);
    expect(email).not.toHaveBeenCalled();
    await notifierParticipant("lou@x.fr", msg, { email, whatsappApi: vi.fn() } as unknown as Envoyeurs);
    expect(email).toHaveBeenCalledWith("lou@x.fr", "S", "T");
  });
});

describe("branchement : les inscriptions en ligne préviennent l'organisateur", () => {
  const source = readFileSync(join(__dirname, "..", "src/app/t/[slug]/inscriptionActions.ts"), "utf-8");
  it("solo et paire appellent notifierNouvelleInscription, après la réponse (after)", () => {
    expect(source.match(/notifierNouvelleInscription\(/g)).toHaveLength(2);
    expect(source).toMatch(/after\(\(\) =>\s*\n?\s*notifierNouvelleInscription/);
  });
});
