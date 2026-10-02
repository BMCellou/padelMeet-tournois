import { describe, expect, it } from "vitest";
import { calculerPlaces, libellePlaces, refusInscription } from "@/lib/inscriptions/places";

describe("calculerPlaces", () => {
  it("illimité quand max est null", () => {
    const p = calculerPlaces(null, 40);
    expect(p.illimite).toBe(true);
    expect(p.complet).toBe(false);
    expect(p.restantes).toBeNull();
    expect(libellePlaces(p)).toBeNull();
    expect(refusInscription(p, 2)).toBeNull();
  });

  it("calcule les places restantes", () => {
    const p = calculerPlaces(16, 11);
    expect(p.restantes).toBe(5);
    expect(libellePlaces(p)).toBe("5 places restantes");
    expect(libellePlaces(calculerPlaces(16, 15))).toBe("1 place restante");
  });

  it("ne descend jamais sous zéro si le club a dépassé la limite à la main", () => {
    const p = calculerPlaces(16, 18);
    expect(p.restantes).toBe(0);
    expect(p.complet).toBe(true);
    expect(libellePlaces(p)).toBe("Complet");
  });
});

describe("refusInscription", () => {
  it("refuse tout quand complet", () => {
    expect(refusInscription(calculerPlaces(16, 16), 1)).toBe("Ce tournoi est complet.");
    expect(refusInscription(calculerPlaces(16, 16), 2)).toBe("Ce tournoi est complet.");
  });

  it("refuse une paire mais accepte un solo quand il reste une place", () => {
    const p = calculerPlaces(16, 15);
    expect(refusInscription(p, 2)).toContain("solo");
    expect(refusInscription(p, 1)).toBeNull();
  });

  it("accepte une paire quand il reste 2 places", () => {
    expect(refusInscription(calculerPlaces(16, 14), 2)).toBeNull();
  });
});
