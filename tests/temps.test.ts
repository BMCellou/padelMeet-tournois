import { describe, expect, it } from "vitest";
import { formatHeureParis, heureLocaleVersISO } from "@/lib/temps";

describe("heureLocaleVersISO", () => {
  it("convertit une heure murale Europe/Paris en été (CEST, UTC+2)", () => {
    expect(heureLocaleVersISO("2026-08-08", "14:00")).toBe("2026-08-08T12:00:00.000Z");
  });

  it("convertit une heure murale Europe/Paris en hiver (CET, UTC+1)", () => {
    expect(heureLocaleVersISO("2026-01-08", "14:00")).toBe("2026-01-08T13:00:00.000Z");
  });
});

describe("formatHeureParis", () => {
  it("retourne null pour une entrée nulle", () => {
    expect(formatHeureParis(null)).toBeNull();
  });

  it("affiche l'heure murale Europe/Paris en été à partir d'un instant UTC", () => {
    expect(formatHeureParis("2026-08-08T12:00:00.000Z")).toBe("14:00");
  });

  it("affiche l'heure murale Europe/Paris en hiver à partir d'un instant UTC", () => {
    expect(formatHeureParis("2026-01-08T13:00:00.000Z")).toBe("14:00");
  });

  it("fait l'aller-retour avec heureLocaleVersISO", () => {
    const iso = heureLocaleVersISO("2026-08-08", "09:30");
    expect(formatHeureParis(iso)).toBe("09:30");
  });
});
