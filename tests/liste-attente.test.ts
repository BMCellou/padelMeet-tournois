import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { inscriptionListeAttenteSchema } from "@/lib/liste-attente/validation";
import { DUREE_CONSERVATION_MOIS, LIBELLE_CONSENTEMENT, sectionsRgpd } from "@/lib/liste-attente/rgpd";
import { lienDesinscription, MODELE_ANNONCE, piedDeDesinscription, verifierMessageListe } from "@/lib/liste-attente/message";
import { versCsv } from "@/lib/liste-attente/csv";
import { CODES_NIVEAU, libelleNiveau } from "@/lib/liste-attente/niveaux";

const lire = (chemin: string) => readFileSync(join(__dirname, "..", chemin), "utf-8");

const valide = {
  prenom: "Camille",
  nom: "Durand",
  email: "Camille.Durand@Exemple.fr",
  telephone: "06 12 34 56 78",
  niveau: "intermediaire",
  ville: "",
  consentement: "on",
};

function premiereErreur(entree: Record<string, unknown>): string | null {
  const r = inscriptionListeAttenteSchema.safeParse(entree);
  return r.success ? null : r.error.issues[0].message;
}

describe("inscription à la liste d'attente", () => {
  it("accepte une inscription complète : e-mail en minuscules, ville facultative", () => {
    const r = inscriptionListeAttenteSchema.safeParse(valide);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.email).toBe("camille.durand@exemple.fr");
      expect(r.data.ville).toBeNull();
    }
  });

  it("garde la ville quand elle est donnée, y compris hors de Lyon", () => {
    const r = inscriptionListeAttenteSchema.safeParse({ ...valide, ville: "  Grenoble " });
    expect(r.success && r.data.ville).toBe("Grenoble");
  });

  it("e-mail, téléphone et niveau sont obligatoires", () => {
    expect(premiereErreur({ ...valide, email: "" })).toBe("L'e-mail est requis.");
    expect(premiereErreur({ ...valide, email: "pas-un-mail" })).toBe("E-mail invalide.");
    expect(premiereErreur({ ...valide, telephone: "" })).toBe("Le numéro de téléphone est requis.");
    expect(premiereErreur({ ...valide, telephone: "abc" })).toContain("invalide");
    expect(premiereErreur({ ...valide, niveau: undefined })).toBe("Choisis ton niveau.");
    expect(premiereErreur({ ...valide, niveau: "dieu" })).toBe("Choisis ton niveau.");
  });

  it("prénom et nom sont requis", () => {
    expect(premiereErreur({ ...valide, prenom: "  " })).toBe("Le prénom est requis.");
    expect(premiereErreur({ ...valide, nom: "" })).toBe("Le nom est requis.");
  });

  it("le consentement est requis : case décochée ou absente", () => {
    expect(premiereErreur({ ...valide, consentement: undefined })).toContain("Coche la case");
    expect(premiereErreur({ ...valide, consentement: "" })).toContain("Coche la case");
  });

  it("les niveaux de la base et ceux du formulaire sont les mêmes", () => {
    expect(CODES_NIVEAU).toEqual(["debutant", "intermediaire", "confirme", "competiteur"]);
    expect(libelleNiveau("confirme")).toBe("Confirmé");
    const migration = lire("supabase/migrations/20261115100000_liste_attente.sql");
    for (const code of CODES_NIVEAU) expect(migration).toContain(`'${code}'`);
  });
});

describe("information RGPD", () => {
  const texte = sectionsRgpd().map((s) => `${s.titre} ${s.texte}`).join("\n");

  it("couvre les mentions de l'article 13 : responsable, finalité, base, données, destinataires, durée, droits, CNIL", () => {
    expect(sectionsRgpd().map((s) => s.titre)).toEqual([
      "Qui collecte tes données",
      "Pourquoi",
      "Sur quelle base",
      "Quelles données",
      "Qui y a accès",
      "Combien de temps",
      "Tes droits",
    ]);
    expect(texte).toContain("consentement");
    expect(texte).toContain("ni vendues ni cédées");
    expect(texte).toContain("CNIL");
    expect(texte).toContain(`${DUREE_CONSERVATION_MOIS} mois`);
    expect(texte).toContain("facultatif");
  });

  it("ne publie une adresse de contact que si elle est configurée", () => {
    expect(texte).not.toContain("@");
    const avec = sectionsRgpd("contact@exemple.fr").map((s) => s.texte).join("\n");
    expect(avec).toContain("contact@exemple.fr");
  });

  it("la case de consentement est libre et précise", () => {
    expect(LIBELLE_CONSENTEMENT).toContain("prochain tournoi");
  });

  it("la durée annoncée est celle que la purge applique", () => {
    expect(lire("src/app/admin/liste-attente/actions.ts")).toContain("DUREE_CONSERVATION_MOIS");
  });
});

describe("message à la liste d'attente", () => {
  it("le modèle ne part pas tant que date, lieu et lien ne sont pas remplis", () => {
    expect(verifierMessageListe(MODELE_ANNONCE.sujet, MODELE_ANNONCE.texte)).toContain("[à compléter]");
    expect(verifierMessageListe("Sujet", "Rendez-vous le 6 décembre à Lyon, inscris-toi sur le site.")).toBeNull();
  });

  it("le pied de page contient le lien personnel de désinscription", () => {
    const lien = lienDesinscription("https://site.exemple/", "a".repeat(32));
    expect(lien).toBe(`https://site.exemple/liste-attente/desinscription/${"a".repeat(32)}`);
    expect(piedDeDesinscription(lien)).toContain(lien);
    expect(piedDeDesinscription(lien)).toContain("liste d'attente");
  });

  it("chaque envoi ajoute le pied de page, et l'essai ne marque personne comme prévenu", () => {
    const source = lire("src/app/admin/liste-attente/actions.ts");
    expect(source).toContain("piedDeDesinscription(lienDesinscription(base, d.token))");
    expect(source).toContain("b.erreur === null && b.id");
    expect(source).toContain("id: null"); // l'essai n'a pas d'identifiant : jamais marqué
  });
});

describe("export CSV", () => {
  it("double les guillemets et sépare par des points-virgules", () => {
    expect(versCsv(["A", "B"], [['dit "oui"', "x"]])).toBe('"A";"B"\r\n"dit ""oui""";"x"');
  });

  it("neutralise les formules glissées dans un champ du formulaire public", () => {
    for (const piege of ["=1+1", "+cmd", "-2", "@SUM(A1)"]) {
      expect(versCsv(["N"], [[piege]])).toContain(`"'${piege}"`);
    }
  });
});

describe("sécurité", () => {
  it("la table est protégée par RLS, sans aucun accès public, ouverte seulement aux admins", () => {
    const sql = lire("supabase/migrations/20261115100000_liste_attente.sql");
    expect(sql).toContain("enable row level security");
    expect(sql).not.toMatch(/to\s+anon/i);
    expect(sql).toContain("is_admin(auth.uid())");
    expect(sql).toContain("create unique index liste_attente_email_idx on liste_attente (lower(email))");
  });

  it("toutes les actions et l'export de l'admin vérifient le rôle admin", () => {
    const actions = lire("src/app/admin/liste-attente/actions.ts");
    expect(actions.match(/export async function/g)).toHaveLength(3);
    expect(actions.match(/if \(!\(await estAdmin\(\)\)\) return \{ error: "Non autorisé\." \}/g)).toHaveLength(3);
    expect(lire("src/app/admin/liste-attente/export/route.ts")).toContain("estAdmin()");
  });

  it("l'inscription publique : champ piège, plafond horaire, doublon silencieux, écriture seule", () => {
    const source = lire("src/app/liste-attente/actions.ts");
    expect(source).toContain('formData.get("site")');
    expect(source).toContain("INSCRIPTIONS_MAX_PAR_HEURE");
    expect(source).toContain('error.code !== "23505"');
    expect(source).not.toContain(".select(\"prenom");
    expect(source).not.toContain("select(\"*\")");
  });

  it("la désinscription exige un jeton de 32 caractères hexadécimaux et un clic (pas de suppression par simple visite)", () => {
    expect(lire("src/app/liste-attente/desinscription/[token]/actions.ts")).toContain("/^[0-9a-f]{32}$/");
    const page = lire("src/app/liste-attente/desinscription/[token]/page.tsx");
    expect(page).not.toContain("seDesinscrire");
    expect(page).toContain("index: false");
  });
});
