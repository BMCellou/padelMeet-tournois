import type { Metadata } from "next";
import Link from "next/link";
import { PageLegale, SectionLegale } from "@/components/PageLegale";
import { CONTACT_GLOBOPADEL, DUREE_CONSERVATION_MOIS } from "@/lib/liste-attente/rgpd";

export const metadata: Metadata = {
  title: "Politique de confidentialité — Globopadel",
  description: "Quelles données Globopadel collecte, pourquoi, combien de temps, et comment exercer tes droits.",
};

/** Une seule expression JSX : un retour à la ligne entre « 24 » et « mois » ferait disparaître l'espace. */
const DUREE = `${DUREE_CONSERVATION_MOIS} mois`;

export default function ConfidentialitePage() {
  const contact = (
    <a className="underline" href={`mailto:${CONTACT_GLOBOPADEL}`}>
      {CONTACT_GLOBOPADEL}
    </a>
  );
  return (
    <PageLegale titre="Politique de confidentialité" misAJour="novembre 2026">
      <SectionLegale titre="Qui est responsable">
        <p>
          Globopadel, éditeur du site app.globopadel.fr (voir les{" "}
          <Link href="/mentions-legales" className="underline">
            mentions légales
          </Link>
          ), est responsable des données personnelles collectées sur ce site. Contact : {contact}.
        </p>
      </SectionLegale>

      <SectionLegale titre="Les données que nous collectons, et pourquoi">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-foreground">Compte joueur :</strong> prénom, nom, e-mail, mot de passe (jamais lisible : seul
            son empreinte est conservée), téléphone, sexe et classement FFT (facultatifs), canal de rappel préféré. Elles servent à
            créer et à gérer ton compte et ton historique. Base légale : l&apos;exécution du service que tu demandes.
          </li>
          <li>
            <strong className="text-foreground">Inscription à un tournoi :</strong> ton inscription, ton équipe et, si tu t&apos;inscris
            en paire, le prénom, le nom, l&apos;e-mail et le téléphone de ton partenaire, que tu renseignes. Elles servent à organiser
            le tournoi (tirage, calendrier, scores) et à vous joindre le jour même. Base légale : l&apos;exécution du service. Si tu
            inscris un partenaire, tu t&apos;engages à l&apos;en informer.
          </li>
          <li>
            <strong className="text-foreground">Messages et rappels :</strong> ton e-mail ou ton téléphone servent à t&apos;envoyer les
            informations pratiques et les rappels de match du tournoi auquel tu participes. Base légale : l&apos;exécution du service.
          </li>
          <li>
            <strong className="text-foreground">Liste d&apos;attente :</strong> prénom, nom, e-mail, téléphone, niveau (de 1 à 8) et
            ville (facultative), pour te prévenir du prochain tournoi. Base légale : ton consentement, que tu peux retirer à tout
            moment ; conservation de {DUREE} au plus après l&apos;inscription.
          </li>
        </ul>
        <p>Nous n&apos;utilisons ces données ni pour de la publicité, ni pour du profilage, et nous ne les vendons ni ne les cédons.</p>
      </SectionLegale>

      <SectionLegale titre="Ce qui est visible publiquement">
        <p>
          La page d&apos;un tournoi affiche le nom des équipes ou des joueurs (prénom et nom), les poules, le calendrier, les scores
          et les classements. Les coordonnées (e-mail, téléphone) ne sont jamais publiées : elles ne sont visibles que de
          l&apos;organisateur.
        </p>
      </SectionLegale>

      <SectionLegale titre="Qui a accès à tes données">
        <p>
          Globopadel et ses organisateurs habilités. Ses prestataires techniques, qui hébergent le site et les données et qui envoient
          les messages, n&apos;agissent que sur ses instructions et n&apos;en font aucun autre usage. Certains de ces prestataires
          peuvent traiter des données en dehors de l&apos;Union européenne ; dans ce cas, des garanties adaptées prévues par le RGPD
          (notamment les clauses contractuelles types) encadrent le transfert.
        </p>
      </SectionLegale>

      <SectionLegale titre="Combien de temps">
        <ul className="list-disc space-y-1 pl-5">
          <li>Compte joueur et historique : tant que ton compte existe, ou jusqu&apos;à ta demande de suppression.</li>
          <li>Liste d&apos;attente : au plus {DUREE} après l&apos;inscription, ou jusqu&apos;à ta désinscription.</li>
          <li>Sauvegardes techniques : chiffrées, elles sont renouvelées régulièrement et ne servent qu&apos;à restaurer le service.</li>
        </ul>
      </SectionLegale>

      <SectionLegale titre="Cookies">
        <p>
          Le site n&apos;utilise que des cookies strictement nécessaires à son fonctionnement : le maintien de ta session de connexion.
          Il n&apos;utilise aucun cookie de mesure d&apos;audience ni de publicité, d&apos;où l&apos;absence de bandeau de consentement.
        </p>
      </SectionLegale>

      <SectionLegale id="droits" titre="Tes droits">
        <p>
          Tu peux accéder à tes données, les faire corriger, les faire effacer, limiter leur usage, t&apos;opposer à leur traitement,
          les récupérer dans un format lisible et, quand le traitement repose sur ton consentement, le retirer à tout moment. Écris à{" "}
          {contact} ; la désinscription de la liste d&apos;attente est aussi possible en un clic depuis chaque message. Nous répondons
          dans un délai d&apos;un mois. Si tu estimes que tes droits ne sont pas respectés, tu peux saisir la CNIL (
          <a className="underline" href="https://www.cnil.fr" rel="noopener noreferrer">
            cnil.fr
          </a>
          ).
        </p>
      </SectionLegale>

      <SectionLegale titre="Sécurité">
        <p>
          Les échanges avec le site sont chiffrés (HTTPS), les mots de passe ne sont jamais conservés en clair et l&apos;accès aux
          coordonnées des joueurs est réservé aux organisateurs authentifiés.
        </p>
      </SectionLegale>

      <SectionLegale titre="Modifications">
        <p>
          Cette politique peut évoluer ; la date de dernière mise à jour figure en haut de page. Tout changement important sera
          signalé sur le site.
        </p>
      </SectionLegale>
    </PageLegale>
  );
}
