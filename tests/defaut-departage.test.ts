// Une seule source de vérité pour l'ordre de départage par défaut : la
// constante du moteur (DEPARTAGE_PAR_DEFAUT, utilisée par l'écran Format &
// règles et les PDF) doit être exactement ce que la base applique à un
// tournoi nouvellement créé (tournaments.tiebreak_rules).

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DEPARTAGE_PAR_DEFAUT } from "@/lib/engine/formatMatch";

const MIGRATIONS = join(__dirname, "..", "supabase", "migrations");

/** Défaut effectif d'après les migrations, dans l'ordre : la dernière définition l'emporte. */
function defautSelonLesMigrations(): string[] {
  let defaut: string[] | null = null;
  for (const fichier of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) {
    const sql = readFileSync(join(MIGRATIONS, fichier), "utf-8");
    const motifs = [
      /tiebreak_rules\s+jsonb[^;,]*?default\s*('\[[^']*\]')/gi,
      /alter\s+column\s+tiebreak_rules\s+set\s+default\s*('\[[^']*\]')/gi,
    ];
    for (const motif of motifs) {
      for (const m of sql.matchAll(motif)) defaut = JSON.parse(m[1].slice(1, -1));
    }
  }
  if (!defaut) throw new Error("Aucun défaut de tiebreak_rules trouvé dans les migrations.");
  return defaut;
}

describe("ordre de départage par défaut", () => {
  it("la constante du moteur égale le défaut défini par les migrations", () => {
    expect(defautSelonLesMigrations()).toEqual(DEPARTAGE_PAR_DEFAUT);
  });

  // Vérification contre la vraie base : crée puis supprime un tournoi. Désactivée par
  // défaut (la suite reste hors ligne) :
  //   set -a; source .env.local; set +a; VERIFIER_BASE_REELLE=1 npx vitest run tests/defaut-departage.test.ts
  it.skipIf(!process.env.VERIFIER_BASE_REELLE)(
    "la base applique, à un tournoi créé sans préciser l'ordre, exactement DEPARTAGE_PAR_DEFAUT",
    async () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const cle = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const entetes = { apikey: cle, Authorization: `Bearer ${cle}`, "Content-Type": "application/json", Prefer: "return=representation" };
      const creation = await fetch(`${url}/rest/v1/tournaments`, {
        method: "POST",
        headers: entetes,
        body: JSON.stringify({ nom: "TEST défaut départage (auto-supprimé)", date: "2030-01-01" }),
      });
      const [tournoi] = (await creation.json()) as { id: string; tiebreak_rules: string[] }[];
      try {
        expect(tournoi.tiebreak_rules).toEqual(DEPARTAGE_PAR_DEFAUT);
      } finally {
        await fetch(`${url}/rest/v1/tournaments?id=eq.${tournoi.id}`, { method: "DELETE", headers: entetes });
      }
    },
  );
});
