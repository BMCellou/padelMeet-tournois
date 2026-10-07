// Aucune donnée personnelle (e-mail, téléphone, canal de rappel, identifiant
// de compte…) ne doit atteindre une page publique. Ces tests échouent si :
//  - une colonne publique est privée, ou un select("*") apparaît ;
//  - une page publique lit directement une table de joueurs ;
//  - une charge utile publique contient une clé privée.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CLES_PRIVEES,
  COLONNES_PUBLIQUES,
  clesPriveesDans,
  garantirChargePublique,
} from "@/lib/tournoi/colonnesPubliques";

const RACINE = join(__dirname, "..");
const lire = (chemin: string) => readFileSync(join(RACINE, chemin), "utf-8");

const FICHIERS_PUBLICS = [
  "src/app/page.tsx",
  "src/app/t/[slug]/page.tsx",
  "src/components/tournoi/ClassementFinalList.tsx",
  "src/components/tournoi/PublicMatchCard.tsx",
  "src/components/tournoi/StandingsTable.tsx",
  ...readdirSync(join(RACINE, "src/app")).includes("TournoisTabs.tsx") ? ["src/app/TournoisTabs.tsx"] : [],
];

/** Mots (identifiants) d'une liste de colonnes PostgREST, relations imbriquées comprises. */
function mots(colonnes: string): string[] {
  return colonnes.split(/[^a-zA-Z0-9_*]+/).filter(Boolean);
}

describe("colonnes publiques explicites", () => {
  it.each(Object.entries(COLONNES_PUBLIQUES))("%s : ni « * », ni colonne privée", (_nom, colonnes) => {
    expect(colonnes).not.toContain("*");
    const privees = new Set<string>(CLES_PRIVEES);
    expect(mots(colonnes).filter((m) => privees.has(m.toLowerCase()))).toEqual([]);
  });

  it("une charge construite à partir de ces colonnes ne contient aucune clé privée", () => {
    const charge = Object.fromEntries(
      Object.entries(COLONNES_PUBLIQUES).map(([nom, colonnes]) => [
        nom,
        [Object.fromEntries(mots(colonnes).map((m) => [m, null]))],
      ]),
    );
    expect(clesPriveesDans(charge)).toEqual([]);
  });
});

describe("pages publiques : aucune lecture directe de données personnelles", () => {
  it.each(FICHIERS_PUBLICS)("%s", (fichier) => {
    const source = lire(fichier);
    expect(source).not.toMatch(/\.select\(\s*["'`]\*/);
    expect(source).not.toMatch(/\.from\(\s*["'`](players|team_players|registrations|memberships|audit_log|rappels_envoyes)["'`]/);
    // Tout select à chaîne littérale reste sans colonne privée.
    for (const [, colonnes] of source.matchAll(/\.select\(\s*["'`]([^"'`]+)["'`]/g)) {
      const privees = new Set<string>(CLES_PRIVEES);
      expect(mots(colonnes).filter((m) => privees.has(m.toLowerCase()))).toEqual([]);
    }
  });

  it("la page d'un tournoi n'utilise l'accès privilégié que pour deux lectures bornées (places, statut du connecté)", () => {
    const source = lire("src/app/t/[slug]/page.tsx");
    const usages = [...source.matchAll(/\bservice\b[^\n]*/g)].map((m) => m[0]);
    expect(source).toContain("chargerPlaces(service");
    expect(source).toContain("chargerStatutInscription(");
    // Aucune requête directe via le client privilégié dans la page.
    expect(source).not.toMatch(/service\s*\.\s*from\(/);
    expect(usages.length).toBeGreaterThan(0);
  });

  it("l'accès privilégié ne renvoie, au visiteur, que des comptages et son propre libellé d'inscription", () => {
    const occupation = lire("src/lib/inscriptions/occupation.ts");
    // Renvoie un objet Places (nombres), jamais les lignes lues.
    expect(occupation).toMatch(/return calculerPlaces\(/);
    const statut = lire("src/app/t/[slug]/inscriptionStatus.ts");
    expect(statut).not.toMatch(/email|telephone|canal_rappel|user_id/);
  });
});

describe("clesPriveesDans / garantirChargePublique", () => {
  it("détecte chaque clé privée à n'importe quelle profondeur, en snake_case comme en camelCase", () => {
    for (const cle of ["email", "telephone", "canal_rappel", "canalRappel", "user_id", "userId", "EMAIL"]) {
      expect(clesPriveesDans({ equipes: [{ joueurs: [{ [cle]: "x" }] }] })).toHaveLength(1);
    }
  });

  it("indique le chemin de la clé fautive", () => {
    expect(clesPriveesDans({ teams: [{ id: 1, players: { email: "a@b.fr" } }] })).toEqual(["teams[0].players.email"]);
  });

  it("laisse passer une charge publique légitime", () => {
    expect(() =>
      garantirChargePublique({
        tournoi: { id: "t", nom: "Open", date: "2026-10-01" },
        teams: [{ id: "a", nom_affiche: "Dupont / Martin" }],
        matchs: [{ id: "m", team_a_id: "a", team_b_id: "b", match_sets: [{ numero: 1, jeux_a: 6, jeux_b: 3 }] }],
      }),
    ).not.toThrow();
  });

  it("plante (fail-closed) si une donnée privée se glisse dans la charge", () => {
    expect(() => garantirChargePublique({ teams: [{ id: "a", email: "a@b.fr" }] })).toThrow(/teams\[0\]\.email/);
    expect(() => garantirChargePublique({ x: { telephone: "0612345678" } })).toThrow();
    expect(() => garantirChargePublique({ x: { canal_rappel: "whatsapp" } })).toThrow();
    expect(() => garantirChargePublique({ x: { user_id: "u" } })).toThrow();
  });
});
