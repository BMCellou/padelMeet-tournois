import { describe, expect, it } from "vitest";
import { construireMessage, formaterDateHeure } from "@/lib/rappels/message";
import { contactPourCanal, emailValide, lienWhatsApp, normaliserTelephone } from "@/lib/rappels/contact";
import { matchsDansFenetre } from "@/lib/rappels/selection";

describe("normaliserTelephone", () => {
  it("convertit un numéro français local", () => {
    expect(normaliserTelephone("06 12 34 56 78")).toBe("33612345678");
    expect(normaliserTelephone("06.12.34.56.78")).toBe("33612345678");
  });
  it("accepte +33 et 0033", () => {
    expect(normaliserTelephone("+33 6 12 34 56 78")).toBe("33612345678");
    expect(normaliserTelephone("0033612345678")).toBe("33612345678");
  });
  it("rejette le vide et le n'importe quoi", () => {
    expect(normaliserTelephone("")).toBeNull();
    expect(normaliserTelephone(null)).toBeNull();
    expect(normaliserTelephone("abc")).toBeNull();
    expect(normaliserTelephone("0612")).toBeNull();
  });
});

describe("contactPourCanal", () => {
  const j = { email: " a@b.fr ", telephone: "0612345678" };
  it("choisit l'e-mail ou le téléphone selon le canal", () => {
    expect(contactPourCanal(j, "email")).toBe("a@b.fr");
    expect(contactPourCanal(j, "whatsapp")).toBe("33612345678");
  });
  it("renvoie null si le contact du canal manque", () => {
    expect(contactPourCanal({ email: null, telephone: "0612345678" }, "email")).toBeNull();
    expect(contactPourCanal({ email: "a@b.fr", telephone: null }, "whatsapp")).toBeNull();
    expect(emailValide("pas un mail")).toBeNull();
  });
});

describe("message", () => {
  it("formate en heure de Paris (été, UTC+2)", () => {
    expect(formaterDateHeure("2026-09-27T12:00:00.000Z")).toBe("dimanche 27 septembre à 14:00");
  });
  it("construit le texte avec terrain", () => {
    const m = construireMessage({
      prenom: "Léa",
      tournoiNom: "Open",
      adversaires: "Dupont / Martin",
      debutISO: "2026-09-27T12:00:00.000Z",
      terrain: "Terrain 2",
    });
    expect(m.texte).toContain("Bonjour Léa");
    expect(m.texte).toContain("dimanche 27 septembre à 14:00 sur Terrain 2");
    expect(m.texte).toContain("Dupont / Martin");
  });
  it("omet le terrain s'il est inconnu", () => {
    const m = construireMessage({
      prenom: "Léa",
      tournoiNom: "Open",
      adversaires: "X",
      debutISO: "2026-09-27T12:00:00.000Z",
      terrain: null,
    });
    expect(m.texte).not.toContain(" sur ");
  });
  it("encode le texte dans le lien WhatsApp", () => {
    expect(lienWhatsApp("33612345678", "a b")).toBe("https://wa.me/33612345678?text=a%20b");
  });
});

describe("matchsDansFenetre", () => {
  const now = new Date("2026-09-26T10:00:00.000Z");
  const base = { statut: "a_venir", teamAId: "a", teamBId: "b" };
  it("garde les matchs à venir dans le délai, écarte les autres", () => {
    const matchs = [
      { id: 1, ...base, scheduledAt: "2026-09-26T18:00:00.000Z" },
      { id: 2, ...base, scheduledAt: "2026-09-28T18:00:00.000Z" },
      { id: 3, ...base, scheduledAt: "2026-09-26T09:00:00.000Z" },
      { id: 4, ...base, scheduledAt: null },
      { id: 5, ...base, statut: "valide", scheduledAt: "2026-09-26T18:00:00.000Z" },
      { id: 6, ...base, teamBId: null, scheduledAt: "2026-09-26T18:00:00.000Z" },
    ];
    expect(matchsDansFenetre(matchs, now, 24).map((m) => m.id)).toEqual([1]);
  });
});
