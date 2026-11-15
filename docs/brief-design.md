# Brief de design — GloboPadel

> À donner tel quel à Claude Design. Il décrit ce que le site fait **aujourd'hui**, la **cible** à
> quelques mois, les **contraintes d'intégration** et les **livrables attendus**. Le design proposé doit
> pouvoir s'intégrer à ce qui existe sans réécrire la logique métier.

## Prompt à coller en tête de conversation

« Je construis **GloboPadel**, une plateforme d'organisation de tournois de padel (inscriptions, poules,
tableaux, scores et classements en direct). Le site fonctionne déjà, avec un design sobre mais sans identité
forte. Je veux une **vraie direction visuelle** et des **maquettes page par page** (mobile d'abord) que je
puisse ensuite intégrer dans le code existant (Next.js + Tailwind v4 + composants shadcn). Lis le brief
ci-dessous : il contient l'existant, la cible, les contraintes et les livrables. Pose-moi tes questions avant
de commencer si quelque chose manque. »

---

## 1. Le produit en deux phrases

GloboPadel permet à un organisateur de tournois de padel (club ou événement d'entreprise) de **publier un
tournoi**, de **recevoir les inscriptions** des joueurs, de **faire le tirage et le calendrier**, de
**saisir les scores** pendant la journée et de **publier les classements en direct**. Les joueurs
s'inscrivent depuis leur téléphone, suivent leurs matchs et retrouvent leur historique.

- **Nom et marque :** GloboPadel (entité en cours de création). Site : `app.globopadel.fr`. Contact : `contact@globopadel.fr`.
- **Langue :** français uniquement. Ton : direct, sportif, chaleureux, tutoiement des joueurs (« Tu es sur la liste »).
- **Lieu d'activité :** Lyon aujourd'hui, mais le site ne doit pas fermer la porte aux autres villes.

## 2. Qui utilise quoi

| Profil | Où | Appareil principal | Ce qu'il fait |
|---|---|---|---|
| **Joueur** | pages publiques + espace joueur | **téléphone**, souvent au bord du terrain | voir les tournois, s'inscrire (solo ou en paire), annuler, suivre poules, scores, tableau, retrouver son historique |
| **Visiteur** (Instagram, bouche à oreille) | accueil, liste d'attente | téléphone | découvrir, laisser ses coordonnées pour le prochain tournoi |
| **Organisateur** (admin) | espace admin | ordinateur, parfois tablette ou téléphone | créer un tournoi, valider les inscriptions, tirer les poules, planifier, saisir les scores, envoyer des messages, imprimer des PDF |
| **Scoreur** | écrans « Scores » et « Tableau final » d'un tournoi | téléphone ou tablette | saisir les scores pendant la journée |
| **Prospect entreprise** (cible) | vitrine + demande de prestation | ordinateur et téléphone | découvrir l'offre, choisir une formule, obtenir un lien d'inscription pour ses collaborateurs |

**Priorité de design :** (1) pages publiques et espace joueur en mobile, (2) vitrine et parcours entreprise,
(3) admin (rester fonctionnel et cohérent, sans refonte lourde).

## 3. Identité actuelle et jetons de design (à respecter ou à faire évoluer explicitement)

Palette en variables CSS (fichier `src/app/globals.css`), logique « 60/30/10 » :

| Rôle | Variable | Valeur |
|---|---|---|
| Fond de page (Paper) | `--background` | `#f6f7f9` |
| Texte (Ink) | `--foreground` | `#0b2233` |
| Carte | `--card` | `#ffffff` |
| **Marque (Navy)** | `--primary` | `#112434` |
| Texte sur marque | `--primary-foreground` | `#ffffff` |
| Fonds neutres / bordures (Mist) | `--secondary`, `--muted`, `--accent`, `--border`, `--input` | `#e5e7eb` |
| Texte discret | `--muted-foreground` | `#5b6b76` |
| **Accent (Volt), jamais en grand aplat** | `--volt` / `--volt-foreground` | `#defe17` / `#112434` |
| Danger | `--destructive` | rouge (oklch 0.577 0.245 27) |
| Dégradés de gris-bleu (graphiques) | `--chart-1` à `--chart-5` | `#112434`, `#5b6b76`, `#8b98a1`, `#b7c0c6`, `#e5e7eb` |
| Arrondi de base | `--radius` | `0.625rem` |

- **Polices :** titres en **Bebas Neue** (capitales, `tracking-wide`), texte en **Montserrat**, chiffres techniques en **Geist Mono**.
- **Logo actuel :** une puce carrée volt portant un « G » marine, suivie du mot « GloboPadel ». C'est un placeholder : un vrai logo est bienvenu.
- **Mode sombre :** des variables existent mais ne sont pas utilisées ni testées. **Pas prioritaire.**
- **Composants** (dossier `src/components/ui/`, basés sur `@base-ui/react` à la manière de shadcn) : Button (variantes dont `volt`), Badge (`default`, `outline`, `volt`), Card, Input, Label, Select, Checkbox, Dialog, Table. Icônes : `lucide-react`.
- **Le volt** sert aux appels à l'action principaux, aux soulignés d'onglets actifs et aux pastilles de statut. Pas de grands fonds volt : lisibilité faible sur blanc.

## 4. Contraintes d'intégration (importantes)

- **Technique :** Next.js 16 (App Router), React 19, **Tailwind CSS v4**, thème par variables CSS. Pages en composants serveur, avec quelques composants clients pour les formulaires et onglets.
- **Livrable intégrable :** préférer du **HTML + classes Tailwind** ou des composants **React/Tailwind** qui réutilisent les noms de variables existants. Proposer toute nouvelle variable avec une valeur et un rôle.
- **Pas de dépendance lourde** : pas de bibliothèque d'animation ou de composants supplémentaire, sauf justification.
- **Mobile d'abord :** concevoir à **375 px**, puis une version **desktop (1280 px)**. Largeurs de contenu actuelles : 576 px pour la page d'un tournoi, 672 px pour l'accueil.
- **Accessibilité :** contraste WCAG AA minimum, zones tactiles d'au moins 44 px, focus visible, textes lisibles en plein soleil (usage au bord du terrain).
- **Performance :** pages légères, polices déjà chargées par Next. Les images ne doivent pas être indispensables à la compréhension.
- **Ne pas toucher** à la logique métier : règles d'inscription, formats de tournoi, calculs de classement.
- **Contenus à données réelles :** les maquettes doivent prévoir des **états** (vide, chargement, erreur, complet, en attente, confirmé), pas seulement le cas heureux.

## 5. L'existant, page par page

### 5.1 Accueil `/`
- **Bandeau marine** : logo à gauche, bouton « Mon compte » à droite.
- **Deux onglets** soulignés en volt : **Tournois** (tous les tournois publiés, en cours ou terminés) et **Inscriptions** (seulement ceux où l'on peut s'inscrire).
- **Cartes de tournoi** : nom en Bebas Neue, ligne « club · jour date mois · niveau · genre », pastille de statut (« À venir », « En cours », « Terminé ») ou pastille volt « S'inscrire ». Un tournoi à venir est mis en avant (bordure marine épaisse, ombre, apparition en fondu échelonné) ; un tournoi terminé est atténué.
- **État vide :** « Aucun tournoi publié pour l'instant. »
- **Pied de page** commun (voir 5.8).
- *Manque aujourd'hui :* aucune présentation de la marque ni de l'offre, aucune mise en avant du prochain tournoi, aucun accès à la liste d'attente.

### 5.2 Page d'un tournoi `/t/[slug]`
- **En-tête** : logo, nom du tournoi, date en toutes lettres, niveau, pastille de statut.
- **Bloc d'inscription** (au-dessus de tout), qui change selon la situation :
  1. **Non connecté :** deux boutons, « Se connecter » et « Créer un compte ».
  2. **Connecté, pas encore inscrit :** formulaire **En paire** (prénom, nom, e-mail et téléphone du partenaire) ou **En solo** (le club associe ensuite un autre joueur seul). Badge du nombre de places (« N places restantes », « 1 place restante », « Complet »), absent si le tournoi est illimité. Si le profil n'a pas de téléphone : invitation à le compléter avant de pouvoir s'inscrire.
  3. **Déjà inscrit :** libellé de l'inscription (« Inscrit en paire avec … », « Inscription validée, en attente d'un binôme »), pastille « En attente de validation par le club » ou « Confirmée », et bouton d'annulation (possible jusqu'à 48 h avant le début, sinon une explication).
  4. **Complet :** message « Ce tournoi est complet, les inscriptions sont fermées. »
- **Suivi en direct** (se rafraîchit tout seul), selon le format :
  - **Poules + tableau final :** une carte par poule (tableau de classement : rang, équipe, matchs, victoires, différence…, puis la liste des matchs avec score ou heure et terrain), puis une carte « Tableau final » (quarts, demies, finale, match pour la 3e place), puis un **classement final** de la 1re à la dernière place.
  - **Poules de niveau** (+ variante avec phase finale) : poules du premier tour, puis « Niveau 1 », « Niveau 2 »… et un classement final complet.
  - **Americano** (on change de partenaire à chaque tour) : **classement individuel**, puis une carte par tour avec ses manches.
- **Carte de match** : deux équipes, score set par set, heure, terrain, état (à venir, en cours, terminé, forfait), vainqueur en gras.
- *Manque aujourd'hui :* la page est une longue colonne de cartes identiques ; pas d'ancres ni de navigation entre « Ma situation », « Poules », « Tableau », « Classement » ; peu de hiérarchie sur ce que le joueur cherche (« à quelle heure je joue, sur quel terrain, contre qui »).

### 5.3 Espace joueur `/compte/*`
- **Connexion** (e-mail, mot de passe, « mot de passe oublié ») et **création de compte** (prénom, nom, sexe, téléphone *obligatoire*, e-mail, mot de passe ; mention d'acceptation des conditions et de la politique de confidentialité). Après connexion, retour sur la page du tournoi d'où l'on vient.
- **Mon compte :** nom en titre, bouton « Se déconnecter », carte « Mon profil » (champs du profil, canal de rappel préféré : e-mail ou WhatsApp), carte « Mes tournois » (lien vers l'historique).
- **Historique :** une carte par tournoi (nom, date, équipe, partenaire ou statut, pastille de statut).

### 5.4 Liste d'attente `/liste-attente` (lien destiné à la bio Instagram)
- Carte centrée : titre, phrase d'accroche, formulaire (prénom, nom, e-mail, téléphone, niveau de 1 à 8 en liste déroulante, ville facultative, case de consentement RGPD, bloc dépliable « Comment tes données sont utilisées »), bouton volt « Rejoindre la liste d'attente ».
- **Confirmation :** « Tu es sur la liste ». **Désinscription** `/liste-attente/desinscription/[jeton]` : une carte avec un seul bouton de confirmation.

### 5.5 Pages légales
- `/mentions-legales`, `/confidentialite`, `/conditions` : texte long, lisible, sous un bandeau de marque, avec le pied de page.

### 5.6 Espace admin `/admin/*` (usage organisateur, ordinateur)
- **Barre latérale :** Tous les tournois, Clubs, Utilisateurs, Joueurs, Liste d'attente, Sauvegardes ; puis, dans un tournoi : Vue d'ensemble, Inscriptions, Format & règles, Poules et tirage, Calendrier, Rappels, Messages, Scores et classements, Tableau final (ou « Déroulé » pour l'Americano).
- **Vue d'ensemble d'un tournoi :** paramètres (club, date, niveau, format, qualifiés, créneaux), lien public à copier, documents PDF à imprimer, scoreurs, terrains.
- Écrans de **saisie** (scores, inscriptions, tirage), de **tableaux** (calendrier par créneau et par terrain) et de **messages**.
- **Objectif de design :** que ces écrans reprennent les mêmes jetons (couleurs, polices, boutons, cartes) pour une cohérence d'ensemble, sans les repenser en détail dans une première phase.

### 5.6 bis Documents PDF (déjà aux couleurs de la marque)
- **Dossier d'organisation**, **résultats** et **planning** envoyé aux joueurs : bandeau marine avec la puce « G » volt en haut de chaque page, couverture en grand bandeau marine, titres soulignés avec un accent volt, en-têtes de tableau marine, lignes alternées, rang 1 surligné en volt pâle. Les contrastes restent lisibles imprimés en noir et blanc. Les polices sont celles du PDF standard (Helvetica) : si une identité typographique est définie, dire comment la décliner.

### 5.7 Messages envoyés (e-mail)
- Rappels de match, messages d'infos du tournoi (avec planning PDF en pièce jointe), annonce du prochain tournoi à la liste d'attente. Aujourd'hui en **texte brut** : un modèle d'e-mail simple et robuste à la marque est un plus.

### 5.8 Pied de page (nouveau, déjà en place)
- Fond marine, trois colonnes : marque et phrase d'accroche ; « Le site » (Tournois, Liste d'attente, Mon compte) ; « Informations » (Mentions légales, Politique de confidentialité, Conditions d'utilisation, Contact) ; ligne « © année GloboPadel. Tous droits réservés. »

## 6. La cible : trois ensembles sur un même site

1. **Vitrine (marque GloboPadel).** Une page d'accueil qui présente GloboPadel, ce qu'on y fait, les prochains tournois, la possibilité de rejoindre la liste d'attente, et l'offre entreprise. Elle remplace l'accueil actuel, qui est aujourd'hui une simple liste de tournois (hypothèse : la vitrine sur `globopadel.fr` et l'application sur `app.globopadel.fr` ; **à confirmer**).
2. **Application tournois (existant).** Liste des tournois, page d'un tournoi avec inscription et suivi en direct, espace joueur, historique.
3. **Prestation pour les entreprises (nouveau).** Une entreprise choisit parmi **3 formules** de prestation padel. Le site **génère un lien d'inscription** à partager aux participants. Selon la formule choisie, l'événement se déroule en **tournoi classique** (poules + tableau) ou en **Americano**. L'application gère ensuite tout le déroulé : inscriptions, tirage, scores, classements.
   - **À préciser avec toi (inconnues) :** le contenu exact des 3 formules, s'il y a un paiement en ligne ou un devis, ce que le client voit pendant et après l'événement, si les participants créent un compte ou s'inscrivent en version allégée.

**Parcours cibles à maquetter**
- *Instagram → liste d'attente :* le visiteur arrive depuis la bio, comprend en 5 secondes de quoi il s'agit, s'inscrit en moins d'une minute.
- *Prospect entreprise → demande de prestation :* il découvre l'offre, compare 3 formules, envoie une demande ou réserve, reçoit un lien de partage.
- *Joueur → inscription → jour J :* il trouve un tournoi, s'inscrit, reçoit ses rappels, consulte ses matchs depuis son téléphone, retrouve les classements.
- *Organisateur → préparation → jour J :* création du tournoi, validation des inscriptions, tirage, calendrier, saisie des scores, publication.

## 7. Ce que j'attends de toi (livrables, dans cet ordre)

1. **Questions** si une information manque (formules, ton de marque, références visuelles aimées ou détestées).
2. **Direction visuelle** : ambiance, principes, 2 ou 3 pistes à comparer avec leurs forces et leurs risques, puis une recommandation. Prendre appui sur la palette marine / volt, en la gardant ou en proposant une évolution justifiée.
3. **Système de design** : jetons (couleurs, typographie, espacements, rayons, ombres) en **variables CSS compatibles avec `globals.css`**, règles d'usage du volt, et spécification des composants existants (boutons, pastilles, cartes, champs, listes déroulantes, cases à cocher, boîtes de dialogue, tableaux) plus les nouveaux (en-tête, navigation mobile, pied de page, bloc héros, carte de tournoi, carte de match, tableau de classement, arbre de tableau final, indicateur d'étapes d'une inscription, états vides, messages d'erreur et de succès).
4. **Maquettes haute fidélité**, mobile **puis** desktop : accueil / vitrine, page d'un tournoi (avec tous ses états), inscription et création de compte, espace joueur, liste d'attente, page de l'offre entreprise et son formulaire de demande, pages légales.
5. **Admin** : proposer seulement l'application des jetons et un exemple d'écran (vue d'ensemble d'un tournoi), pas une refonte écran par écran.
6. **Logo** : au moins une piste de logotype et d'icône (l'actuel est un « G » dans un carré volt) et une icône de site.
7. **Notes d'intégration** : comment passer de tes maquettes au code existant (quels composants réutiliser, quels nouveaux créer, ce qui change dans `globals.css`).

**À ne pas faire :** inventer des fonctionnalités absentes ou de faux contenus présentés comme réels (noms, scores, témoignages, partenaires). Les contenus d'exemple doivent être clairement marqués comme tels.

## 8. Annexes

**Statuts affichés.** Tournoi : « À venir » (publié), « En cours », « Terminé » (un tournoi en brouillon n'est pas public). Inscription : « En attente de validation par le club », « Confirmée », « Inscription validée, en attente d'un binôme ». Match : à venir, en cours, terminé, forfait.

**Formats de tournoi gérés.**
- *Poules + tableau :* binômes fixes en poules, puis tableau à élimination directe avec match pour la 3e place.
- *Poules de niveau :* autant de poules que possible (3 équipes minimum), puis second tour où les équipes de même rang se retrouvent ; classement de la 1re à la dernière place. Variante avec phase finale (tableau pour les meilleures, niveaux de classement pour les autres).
- *Americano :* on change de partenaire à chaque tour, classement individuel, personne n'est éliminé.

**Échelle de niveau (liste d'attente).** De 1 à 8 : Initiation, Débutant, Débutant confirmé, Intermédiaire, Intermédiaire confirmé, Confirmé, Avancé, Expert.

**Données qui ne doivent jamais apparaître publiquement.** Téléphones, e-mails, notes internes. Seuls les noms des équipes ou joueurs, poules, calendrier, scores et classements sont publics.

**Références du code (pour l'intégration).** Thème : `src/app/globals.css`. Composants : `src/components/ui/`, `src/components/BrandLogo.tsx`, `src/components/SiteFooter.tsx`. Accueil : `src/app/page.tsx` et `src/app/TournoisTabs.tsx`. Page d'un tournoi : `src/app/t/[slug]/page.tsx` et `src/app/t/[slug]/InscriptionTournoi.tsx`, `src/components/tournoi/*`. Espace joueur : `src/app/compte/*`. Liste d'attente : `src/app/liste-attente/*`.
