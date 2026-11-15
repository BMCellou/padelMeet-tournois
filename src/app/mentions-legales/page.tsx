import type { Metadata } from "next";
import Link from "next/link";
import { PageLegale, SectionLegale } from "@/components/PageLegale";
import { EDITEUR, HEBERGEUR, URL_SITE, lignesEditeur } from "@/lib/legal/editeur";

export const metadata: Metadata = {
  title: "Mentions légales — Globopadel",
  description: "Éditeur, hébergeur et propriété intellectuelle du site app.globopadel.fr.",
};

export default function MentionsLegalesPage() {
  return (
    <PageLegale titre="Mentions légales" misAJour="novembre 2026">
      <SectionLegale titre="Éditeur du site">
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
      </SectionLegale>

      {EDITEUR.directeurPublication ? (
        <SectionLegale titre="Directeur de la publication">
          <p>{EDITEUR.directeurPublication}</p>
        </SectionLegale>
      ) : null}

      <SectionLegale titre="Hébergeur">
        <p>
          Le site est hébergé par {HEBERGEUR.nom}, {HEBERGEUR.adresse} ({HEBERGEUR.site.replace("https://", "")}).
        </p>
      </SectionLegale>

      <SectionLegale titre="Objet du site">
        <p>
          Le site permet de s&apos;inscrire à des tournois de padel organisés par Globopadel, de suivre leur déroulement (poules,
          calendrier, scores, classements) et de rejoindre la liste d&apos;attente du prochain tournoi.
        </p>
      </SectionLegale>

      <SectionLegale id="donnees" titre="Données personnelles et cookies">
        <p>
          Le traitement des données personnelles, vos droits, les durées de conservation et l&apos;utilisation des cookies sont
          détaillés dans la{" "}
          <Link href="/confidentialite" className="underline">
            politique de confidentialité
          </Link>
          . Pour toute demande :{" "}
          <a className="underline" href={`mailto:${EDITEUR.email}`}>
            {EDITEUR.email}
          </a>
          .
        </p>
      </SectionLegale>

      <SectionLegale titre="Propriété intellectuelle">
        <p>
          La marque, le nom, les logos, les textes, les mises en page et le code du site sont la propriété de Globopadel ou de ses
          concédants. Toute reproduction ou réutilisation, totale ou partielle, sans autorisation écrite préalable est interdite.
        </p>
      </SectionLegale>

      <SectionLegale titre="Responsabilité">
        <p>
          Les informations publiées (horaires, poules, scores, classements) sont données à titre indicatif et peuvent évoluer
          jusqu&apos;au jour du tournoi ; en cas de doute, l&apos;organisateur sur place fait foi. Globopadel s&apos;efforce
          d&apos;assurer la disponibilité du site mais ne peut garantir un accès ininterrompu, ni être tenue responsable des contenus
          de sites tiers vers lesquels il pourrait renvoyer.
        </p>
      </SectionLegale>

      <SectionLegale titre="Droit applicable">
        <p>
          Les présentes mentions sont soumises au droit français. En cas de litige, une solution amiable sera recherchée avant toute
          action en justice.
        </p>
      </SectionLegale>
    </PageLegale>
  );
}
