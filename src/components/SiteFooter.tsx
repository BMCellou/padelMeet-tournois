import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { CONTACT_GLOBOPADEL } from "@/lib/liste-attente/rgpd";

const NAVIGATION = [
  { href: "/", libelle: "Tournois" },
  { href: "/liste-attente", libelle: "Liste d'attente" },
  { href: "/compte", libelle: "Mon compte" },
];

const INFORMATIONS = [
  { href: "/mentions-legales", libelle: "Mentions légales" },
  { href: "/confidentialite", libelle: "Politique de confidentialité" },
  { href: "/conditions", libelle: "Conditions d'utilisation" },
];

/** Pied de page commun des pages publiques : navigation, liens légaux obligatoires, contact. */
export function SiteFooter() {
  return (
    <footer className="mt-auto w-full bg-primary text-primary-foreground">
      <div className="mx-auto grid w-full max-w-4xl gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6">
        <div className="space-y-3">
          <BrandLogo />
          <p className="text-sm text-primary-foreground/70">
            Inscriptions, poules, scores et classements de tournois de padel, en direct.
          </p>
        </div>
        <nav aria-label="Navigation" className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-primary-foreground/55">Le site</p>
          <ul className="space-y-2 text-sm">
            {NAVIGATION.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:underline">
                  {l.libelle}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Informations légales" className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-primary-foreground/55">Informations</p>
          <ul className="space-y-2 text-sm">
            {INFORMATIONS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="hover:underline">
                  {l.libelle}
                </Link>
              </li>
            ))}
            <li>
              <a href={`mailto:${CONTACT_GLOBOPADEL}`} className="hover:underline">
                Contact
              </a>
            </li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-primary-foreground/15">
        <p className="mx-auto w-full max-w-4xl px-4 py-4 text-xs text-primary-foreground/55 sm:px-6">
          © {new Date().getFullYear()} Globopadel. Tous droits réservés.
        </p>
      </div>
    </footer>
  );
}
