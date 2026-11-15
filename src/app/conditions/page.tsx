import type { Metadata } from "next";
import Link from "next/link";
import { PageLegale, SectionLegale } from "@/components/PageLegale";
import { CONTACT_GLOBOPADEL } from "@/lib/liste-attente/rgpd";

export const metadata: Metadata = {
  title: "Conditions d'utilisation — GloboPadel",
  description: "Les règles d'utilisation du site app.globopadel.fr : compte, inscriptions, annulations, responsabilités.",
};

export default function ConditionsPage() {
  return (
    <PageLegale titre="Conditions d'utilisation" misAJour="novembre 2026">
      <SectionLegale titre="Objet">
        <p>
          Les présentes conditions encadrent l&apos;utilisation du site app.globopadel.fr, édité par GloboPadel (voir les{" "}
          <Link href="/mentions-legales" className="underline">
            mentions légales
          </Link>
          ). Il permet de créer un compte joueur, de s&apos;inscrire à des tournois de padel, de suivre leur déroulement et de rejoindre
          la liste d&apos;attente du prochain tournoi. Utiliser le site vaut acceptation de ces conditions.
        </p>
      </SectionLegale>

      <SectionLegale titre="Compte joueur">
        <p>
          Les informations données à la création du compte (identité, e-mail, téléphone) doivent être exactes et tenues à jour : elles
          servent à te joindre avant et pendant le tournoi. Ton mot de passe est personnel ; tu es responsable de l&apos;usage qui en
          est fait. Tu peux demander la suppression de ton compte à tout moment à {CONTACT_GLOBOPADEL}.
        </p>
      </SectionLegale>

      <SectionLegale titre="Inscription à un tournoi">
        <ul className="list-disc space-y-2 pl-5">
          <li>Une inscription n&apos;est définitive qu&apos;une fois validée par l&apos;organisateur ; elle peut être refusée, notamment si le tournoi est complet.</li>
          <li>Les places sont limitées. En cas de dépassement, l&apos;organisateur peut refuser une inscription ou en annuler une.</li>
          <li>
            Si tu t&apos;inscris en paire, tu garantis avoir l&apos;accord de ton partenaire pour communiquer ses coordonnées. L&apos;organisateur peut aussi
            associer deux joueurs inscrits seuls.
          </li>
          <li>
            Le site ne gère pas de paiement en ligne. Les éventuelles modalités de participation aux frais sont communiquées par
            l&apos;organisateur.
          </li>
        </ul>
      </SectionLegale>

      <SectionLegale titre="Annulation">
        <p>
          Tu peux annuler ton inscription depuis la page du tournoi jusqu&apos;à 48 heures avant son début, tant que le tirage n&apos;a pas
          été effectué. Annuler une inscription en paire annule celle des deux joueurs et prévient ton partenaire par e-mail. Passé ce
          délai, contacte directement l&apos;organisateur. Un joueur absent le jour du tournoi sans avoir prévenu peut entraîner le
          forfait de son équipe.
        </p>
      </SectionLegale>

      <SectionLegale titre="Déroulement des tournois">
        <p>
          L&apos;organisateur fixe le format, les poules, le calendrier et les règles de score, et peut les modifier, y compris le jour
          même, notamment pour tenir compte des absences ou des conditions de jeu. Les horaires, poules et classements affichés sur le
          site sont indicatifs : l&apos;organisateur sur place fait foi. Chaque participant s&apos;engage à respecter les consignes de
          l&apos;organisateur et du club, ainsi que l&apos;esprit sportif ; un comportement inapproprié peut conduire à l&apos;exclusion.
        </p>
      </SectionLegale>

      <SectionLegale titre="Aptitude et responsabilité">
        <p>
          Le padel est une activité sportive. En t&apos;inscrivant, tu déclares être apte à la pratiquer et être couvert(e) par une
          assurance de responsabilité civile. GloboPadel n&apos;est pas responsable des dommages résultant de la pratique du sport ni de
          l&apos;indisponibilité temporaire du site.
        </p>
      </SectionLegale>

      <SectionLegale titre="Utilisation du site">
        <p>
          Il est interdit de perturber le fonctionnement du site, d&apos;en extraire les données de manière automatisée, d&apos;usurper
          l&apos;identité d&apos;une autre personne ou d&apos;inscrire quelqu&apos;un sans son accord.
        </p>
      </SectionLegale>

      <SectionLegale titre="Données personnelles">
        <p>
          Le traitement de tes données est décrit dans la{" "}
          <Link href="/confidentialite" className="underline">
            politique de confidentialité
          </Link>
          .
        </p>
      </SectionLegale>

      <SectionLegale titre="Modification et droit applicable">
        <p>
          Ces conditions peuvent être modifiées ; la version en vigueur est celle publiée sur cette page. Elles sont soumises au droit
          français. En cas de litige, une solution amiable sera recherchée avant toute action en justice.
        </p>
      </SectionLegale>
    </PageLegale>
  );
}
