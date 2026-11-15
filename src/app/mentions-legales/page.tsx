import type { Metadata } from "next";
import { BrandLogo } from "@/components/BrandLogo";
import { EDITEUR, HEBERGEUR, URL_SITE, lignesEditeur } from "@/lib/legal/editeur";
import { DUREE_CONSERVATION_MOIS } from "@/lib/liste-attente/rgpd";

export const metadata: Metadata = {
  title: "Mentions légales — Globopadel",
  description: "Éditeur, hébergeur, données personnelles et conditions d'utilisation du site app.globopadel.fr.",
};

function Section({ id, titre, children }: { id?: string; titre: string; children: React.ReactNode }) {
  return (
    <section id={id} className="space-y-2">
      <h2 className="text-lg font-semibold">{titre}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export default function MentionsLegalesPage() {
  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="bg-primary p-3 text-primary-foreground">
        <div className="mx-auto w-fit">
          <BrandLogo />
        </div>
      </div>
      <main className="mx-auto w-full max-w-2xl space-y-8 p-4 sm:py-8">
        <h1 className="text-2xl font-semibold">Mentions légales</h1>

        <Section titre="Éditeur du site">
          <p>
            Le site <strong>{URL_SITE.replace("https://", "")}</strong> est édité par :
          </p>
          <dl className="space-y-1">
            {lignesEditeur(EDITEUR).map(([libelle, valeur]) => (
              <div key={libelle} className="flex gap-2">
                <dt className="w-44 shrink-0 text-foreground">{libelle}</dt>
                <dd>{valeur}</dd>
              </div>
            ))}
          </dl>
        </Section>

        {EDITEUR.directeurPublication ? (
          <Section titre="Directeur de la publication">
            <p>{EDITEUR.directeurPublication}</p>
          </Section>
        ) : null}

        <Section titre="Hébergeur">
          <p>
            Le site est hébergé par {HEBERGEUR.nom}, {HEBERGEUR.adresse} ({HEBERGEUR.site.replace("https://", "")}).
          </p>
        </Section>

        <Section titre="Objet du site">
          <p>
            Le site permet de s&apos;inscrire à des tournois de padel organisés par Globopadel, de suivre leur déroulement
            (poules, calendrier, scores, classements) et de rejoindre la liste d&apos;attente du prochain tournoi.
          </p>
        </Section>

        <Section id="donnees" titre="Données personnelles">
          <p>
            Globopadel est responsable des données personnelles collectées sur ce site (inscription à un compte joueur, à un
            tournoi ou à la liste d&apos;attente). Elles servent uniquement à organiser les tournois, à joindre les participants
            avant et pendant l&apos;événement et, avec leur consentement, à les prévenir du prochain tournoi. Elles ne sont ni
            vendues ni cédées.
          </p>
          <p>
            Les données de la liste d&apos;attente sont conservées au plus {DUREE_CONSERVATION_MOIS} mois après l&apos;inscription,
            et supprimées immédiatement à la demande de la personne. Les informations détaillées (finalités, base légale,
            destinataires, durées) sont présentées sur le formulaire concerné.
          </p>
          <p>
            Conformément au règlement général sur la protection des données (RGPD) et à la loi Informatique et Libertés, chaque
            personne dispose d&apos;un droit d&apos;accès, de rectification, d&apos;effacement, de limitation, d&apos;opposition et,
            lorsque le traitement repose sur son consentement, du droit de le retirer à tout moment. Pour les exercer, écrire à{" "}
            <a className="underline" href={`mailto:${EDITEUR.email}`}>
              {EDITEUR.email}
            </a>
            . En cas de difficulté, une réclamation peut être adressée à la CNIL (
            <a className="underline" href="https://www.cnil.fr" rel="noopener noreferrer">
              cnil.fr
            </a>
            ).
          </p>
        </Section>

        <Section titre="Cookies">
          <p>
            Le site n&apos;utilise que des cookies strictement nécessaires à son fonctionnement (maintien de la session de
            connexion des comptes joueurs et organisateurs). Il n&apos;utilise aucun cookie de mesure d&apos;audience ni de
            publicité : aucun bandeau de consentement n&apos;est donc nécessaire.
          </p>
        </Section>

        <Section titre="Propriété intellectuelle">
          <p>
            La marque, le nom, les logos, les textes, les mises en page et le code du site sont la propriété de Globopadel ou
            de ses concédants. Toute reproduction ou réutilisation, totale ou partielle, sans autorisation écrite préalable est
            interdite.
          </p>
        </Section>

        <Section titre="Responsabilité">
          <p>
            Les informations publiées (horaires, poules, scores, classements) sont données à titre indicatif et peuvent évoluer
            jusqu&apos;au jour du tournoi ; en cas de doute, l&apos;organisateur sur place fait foi. Globopadel s&apos;efforce
            d&apos;assurer la disponibilité du site mais ne peut garantir un accès ininterrompu, ni être tenue responsable des
            contenus de sites tiers vers lesquels il pourrait renvoyer.
          </p>
        </Section>

        <Section titre="Droit applicable">
          <p>
            Les présentes mentions sont soumises au droit français. En cas de litige, une solution amiable sera recherchée
            avant toute action en justice.
          </p>
        </Section>
      </main>
    </div>
  );
}
