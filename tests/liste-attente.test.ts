import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { inscriptionListeAttenteSchema } from "@/lib/liste-attente/validation";
import { DUREE_CONSERVATION_MOIS, LIBELLE_CONSENTEMENT, sectionsRgpd } from "@/lib/liste-attente/rgpd";
import { lienDesinscription, MODELE_ANNONCE, piedDeDesinscription, verifierMessageListe } from "@/lib/liste-attente/message";
import { versCsv } from "@/lib/liste-attente/csv";
import { libelleNiveau, NIVEAUX_LISTE_ATTENTE } from "@/lib/liste-attente/niveaux";
import { CONTACT_GLOBOPADEL } from "@/lib/liste-attente/rgpd";
import { CONCEPTEUR, EDITEUR, HEBERGEUR, lignesEditeur } from "@/lib/legal/editeur";

const lire = (chemin: string) => readFileSync(join(__dirname, "..", chemin), "utf-8");

const valide = {
  prenom: "Camille",
  nom: "Durand",
  email: "Camille.Durand@Exemple.fr",
  telephone: "06 12 34 56 78",
  niveau: "4",
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
      expect(r.data.niveau).toBe(4);
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
    expect(premiereErreur({ ...valide, niveau: "" })).toBe("Choisis ton niveau.");
  });

  it("prénom et nom sont requis", () => {
    expect(premiereErreur({ ...valide, prenom: "  " })).toBe("Le prénom est requis.");
    expect(premiereErreur({ ...valide, nom: "" })).toBe("Le nom est requis.");
  });

  it("le consentement est requis : case décochée ou absente", () => {
    expect(premiereErreur({ ...valide, consentement: undefined })).toContain("Coche la case");
    expect(premiereErreur({ ...valide, consentement: "" })).toContain("Coche la case");
  });

  it("le niveau suit l'échelle de 1 à 8 : 1 et 8 acceptés, 0, 9 et les décimales refusés", () => {
    for (const n of ["1", "8", 5]) expect(premiereErreur({ ...valide, niveau: n }), String(n)).toBeNull();
    for (const n of ["0", "9", "4.5", "-1"]) expect(premiereErreur({ ...valide, niveau: n }), n).toBe("Choisis ton niveau.");
  });

  it("le formulaire propose exactement les niveaux 1 à 8 et la base les accepte", () => {
    expect(NIVEAUX_LISTE_ATTENTE.map((n) => n.niveau)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(libelleNiveau(4)).toBe("4 – Intermédiaire");
    expect(libelleNiveau(99)).toBe("99");
    expect(lire("supabase/migrations/20261115100000_liste_attente.sql")).toContain("check (niveau between 1 and 8)");
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
    expect(DUREE_CONSERVATION_MOIS).toBe(24);
    expect(texte).toContain("facultatif");
  });

  it("désigne Globopadel comme responsable, avec son adresse de contact", () => {
    expect(CONTACT_GLOBOPADEL).toBe("contact@globopadel.fr");
    expect(texte).toContain("Globopadel");
    expect(texte).toContain("app.globopadel.fr");
    expect(texte).toContain("contact@globopadel.fr");
    expect(sectionsRgpd("autre@exemple.fr").map((s) => s.texte).join("\n")).toContain("autre@exemple.fr");
  });

  it("parle de prestataires techniques sans jamais citer la pile technique", () => {
    expect(texte).toContain("prestataires techniques");
    expect(texte).not.toMatch(/supabase|vercel|make\b|gmail|resend|google|amazon|aws/i);
  });

  it("la case de consentement est libre et précise", () => {
    expect(LIBELLE_CONSENTEMENT).toContain("Globopadel");
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
    expect(piedDeDesinscription(lien)).toContain("liste d'attente de Globopadel");
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

describe("mentions légales", () => {
  it("n'affiche que les informations connues de l'éditeur, jamais un champ vide", () => {
    expect(lignesEditeur(EDITEUR).map(([l]) => l)).toEqual(["Éditeur", "E-mail"]);
    const complet = lignesEditeur({
      ...EDITEUR,
      formeJuridique: "SAS",
      capitalSocial: "1 000 €",
      siegeSocial: "1 rue Exemple, 69000 Lyon",
      immatriculation: "123 456 789",
      tvaIntracommunautaire: "FR00123456789",
      telephone: "04 00 00 00 00",
    });
    expect(complet.map(([l]) => l)).toEqual([
      "Éditeur", "Forme juridique", "Capital social", "Siège social", "Immatriculation", "TVA intracommunautaire", "Téléphone", "E-mail",
    ]);
    expect(lignesEditeur({ ...EDITEUR, siegeSocial: "   " }).map(([l]) => l)).not.toContain("Siège social");
  });

  it("publie l'éditeur, l'hébergeur, l'objet, les données, la propriété intellectuelle, la responsabilité et le droit applicable", () => {
    const page = lire("src/app/mentions-legales/page.tsx");
    for (const titre of ["Éditeur du site", "Hébergeur", "Objet du site", "Données personnelles et cookies", "Propriété intellectuelle", "Responsabilité", "Droit applicable"]) {
      expect(page, titre).toContain(`titre="${titre}"`);
    }
    expect(page).toContain("HEBERGEUR");
    expect(page).toContain("lignesEditeur(EDITEUR)");
    expect(page).toContain('href="/confidentialite"');
    expect(page).not.toContain("[à compléter]");
    expect(HEBERGEUR.nom).toBe("Vercel");
  });

  it("annonce une société en cours de formation, le prestataire de conception et l'hébergeur dont l'adresse reste à publier", () => {
    expect(EDITEUR.denomination).toBe("GloboPadel SASU");
    expect(EDITEUR.enFormation).toBe(true);
    expect(CONCEPTEUR).toMatchObject({ nom: "MCB SERVICES", siren: "943 478 438" });
    expect(HEBERGEUR.adresse).toBeNull();
    const page = lire("src/app/mentions-legales/page.tsx");
    expect(page).toContain('titre="Conception et développement technique"');
    expect(page).toContain("société en cours de formation");
    expect(page).toContain("seront mises à jour après son immatriculation");
    expect(page).toContain("seront indiquées dans cette rubrique");
  });

  it("ne publie jamais l'adresse e-mail personnelle de l'organisateur", () => {
    for (const f of ["src/lib/legal/editeur.ts", "src/app/mentions-legales/page.tsx"]) {
      expect(lire(f), f).not.toMatch(/gmail\.com/);
    }
  });

  it("la politique de confidentialité couvre les traitements, la visibilité publique, les durées, les cookies, les droits et la CNIL", () => {
    const page = lire("src/app/confidentialite/page.tsx");
    for (const titre of ["Qui est responsable", "Les données que nous collectons, et pourquoi", "Ce qui est visible publiquement", "Qui a accès à tes données", "Combien de temps", "Cookies", "Tes droits", "Sécurité"]) {
      expect(page, titre).toContain(`titre="${titre}"`);
    }
    for (const traitement of ["Compte joueur", "Inscription à un tournoi", "Messages et rappels", "Liste d&apos;attente"]) {
      expect(page, traitement).toContain(traitement);
    }
    expect(page).toContain("DUREE_CONSERVATION_MOIS");
    expect(page).toContain("CNIL");
    expect(page).not.toMatch(/supabase|vercel|make\.com|gmail|resend|google|amazon|aws/i);
    expect(page).not.toContain("[à compléter]");
  });

  it("les conditions d'utilisation reprennent la règle réelle d'annulation (48 h, avant le tirage)", () => {
    const page = lire("src/app/conditions/page.tsx");
    expect(page).toContain("jusqu&apos;à 48 heures avant son début");
    expect(page).toContain("tant que le tirage n&apos;a pas");
    for (const titre of ["Compte joueur", "Inscription à un tournoi", "Annulation", "Aptitude et responsabilité", "Modification et droit applicable"]) {
      expect(page, titre).toContain(`titre="${titre}"`);
    }
    // la règle affichée est celle du code
    expect(lire("src/lib/inscriptions/annulation.ts")).toContain("DELAI_ANNULATION_HEURES = 48");
  });

  it("le pied de page porte les trois liens légaux et le contact, sur toutes les pages publiques", () => {
    const pied = lire("src/components/SiteFooter.tsx");
    for (const lien of ['href: "/mentions-legales"', 'href: "/confidentialite"', 'href: "/conditions"', "mailto:${CONTACT_GLOBOPADEL}"]) {
      expect(pied, lien).toContain(lien);
    }
    expect(pied).toContain("Globopadel. Tous droits réservés");
    for (const f of [
      "src/app/TournoisTabs.tsx",
      "src/app/t/[slug]/page.tsx",
      "src/app/liste-attente/page.tsx",
      "src/app/liste-attente/desinscription/[token]/page.tsx",
      "src/app/compte/page.tsx",
      "src/app/compte/historique/page.tsx",
      "src/components/PageLegale.tsx",
    ]) {
      expect(lire(f), f).toContain("<SiteFooter />");
    }
  });

  it("la création de compte renvoie aux conditions et à la politique de confidentialité", () => {
    const page = lire("src/app/compte/inscription/page.tsx");
    expect(page).toContain('href="/conditions"');
    expect(page).toContain('href="/confidentialite"');
  });

  it("ne déclare aucun cookie de mesure : le site n'embarque aucun outil d'audience", () => {
    const paquet = lire("package.json");
    expect(paquet).not.toMatch(/analytics|gtag|plausible|matomo|hotjar|segment/i);
  });
});
