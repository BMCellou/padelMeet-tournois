# PadelMeet Tournois — Spécifications fonctionnelles

Dernière mise à jour : 6 octobre 2026. Ce document décrit l'application **telle qu'elle est aujourd'hui** : ce qu'un utilisateur peut faire, les règles de gestion appliquées, et ce qui n'est pas (encore) disponible.

## 1. Objet

PadelMeet Tournois permet à un club de padel français d'organiser des tournois par paires : inscriptions en ligne, tirage des poules, calendrier des matchs sur les terrains, saisie des scores en direct, classements, tableau final et rappels aux joueurs. Les joueurs suivent le tournoi en direct depuis une page publique.

## 2. Acteurs et droits

| Acteur | Comment il est identifié | Ce qu'il peut faire |
|---|---|---|
| **Visiteur** | Aucun compte | Voir la liste des tournois, la page publique d'un tournoi publié (poules, classements, tableau, résultats en direct). |
| **Participant** | Compte joueur (e-mail + mot de passe) avec une fiche joueur | S'inscrire à un tournoi publié (en paire ou en solo), modifier son profil, consulter son historique. |
| **Scoreur** | Compte avec le rôle « scoreur » rattaché à un ou plusieurs tournois | Saisir et valider les scores, consulter classements et tableau final **de ses tournois uniquement**. Rien d'autre. |
| **Admin** | Compte avec le rôle « admin » (global) | Tout le reste : clubs, tournois, inscriptions, tirage, calendrier, qualifiés, rappels, utilisateurs, joueurs, sauvegardes. |

Un même compte peut cumuler des rôles (admin et participant, par exemple) : il n'y a jamais deux comptes pour la même adresse e-mail.

Règles de protection :
- Les écrans `/admin/*` sont réservés aux admins. Un scoreur n'accède, pour ses tournois, qu'aux écrans **Scores** et **Tableau final** ; s'il s'égare ailleurs, il est ramené vers l'un de ses tournois. Il ne voit jamais les réglages du tournoi, les inscriptions ni l'éditeur de qualifiés.
- Un participant n'a aucun accès `/admin` ; l'espace `/compte` exige une fiche joueur.
- Un compte créé par un admin avec un mot de passe provisoire doit en définir un nouveau avant toute autre action.
- Le dernier compte admin actif ne peut être ni retiré ni désactivé.

## 3. Cycle de vie d'un tournoi

Statuts : **Brouillon → Publié → En cours → Terminé** (l'admin peut changer le statut à tout moment dans « Modifier »).

- **Brouillon** : invisible du public.
- **Publié** : visible sur l'accueil et sur sa page publique ; **les inscriptions en ligne sont ouvertes uniquement dans cet état**.
- **En cours / Terminé** : visibles, inscriptions en ligne fermées.

Déroulé type : créer le tournoi → publier → recueillir les inscriptions → valider les équipes → tirer les poules → générer le calendrier → jouer les poules (scores) → tableau final généré automatiquement → jouer le tableau → classement final.

## 4. Administration

### 4.1 Tournois

Création (`/admin/tournois/nouveau`) et modification d'un tournoi : nom, club (facultatif au départ), date, genre (masculin / féminin / mixte), niveau (texte libre, ex. « P100-P250 »), statut, nombre de qualifiés pour le tableau, durée d'un créneau de match (min), pause entre matchs (min), **nombre maximum de joueurs** (voir §5.4).

Chaque tournoi reçoit un **lien public non devinable** (identifiant aléatoire de 12 caractères). Un tournoi peut être supprimé : toutes ses données (équipes, poules, matchs, inscriptions) sont supprimées avec lui.

Réglages de la vue d'ensemble d'un tournoi : choix du club, terrains utilisés par le tournoi, lien public, **arbitres/scoreurs** (invitation par e-mail, voir §4.3).

Le **format de match**, le format propre à chaque phase et l'**ordre de départage** se règlent dans l'onglet **Format & règles** (§4.6) ; un tournoi est créé avec les valeurs par défaut (§8.1 et §9).

### 4.2 Clubs et terrains

Un club a un nom et une ville ; il possède des terrains (nom, ordre). Un tournoi choisit parmi les terrains de son club ceux qui sont utilisés. On peut ajouter, renommer, activer/désactiver pour un tournoi, ou supprimer un terrain.

### 4.3 Utilisateurs et rôles (`/admin/utilisateurs`)

- Créer un compte (nom, prénom, e-mail, rôle : aucun / admin / scoreur d'un tournoi) : un **mot de passe provisoire** est généré et affiché une seule fois ; la personne doit le changer à sa première connexion.
- Créer un compte pour une fiche joueur existante (sans compte) : le compte est **rattaché à la fiche** pour conserver son historique.
- Ajouter ou retirer un rôle ; désactiver / réactiver un compte ; modifier le profil.
- Inviter un scoreur depuis un tournoi : si l'e-mail a déjà un compte, le rôle lui est ajouté sans toucher à son mot de passe ; sinon un compte est créé.

### 4.4 Joueurs (`/admin/joueurs`)

Vue de **tous les joueurs du système**, tous tournois confondus, avec leurs affectations (équipes, inscriptions solo), un badge « Compte / Sans compte » et « Aucun tournoi ». Fonctions :
- Recherche.
- **Remplacer un joueur dans une équipe** : le remplaçant ne doit pas déjà jouer dans une autre équipe du même tournoi.
- **Supprimer une fiche orpheline** : uniquement si le joueur n'a **aucun compte** et **aucun tournoi** (vérifié côté serveur, confirmation en deux temps). Un joueur avec compte ne se supprime jamais ici : on le désactive depuis Utilisateurs.

### 4.5 Sauvegardes (`/admin/sauvegardes`)

- **Sauvegarde automatique chaque nuit** (3 h UTC) de toutes les tables dans un espace de stockage privé, au format JSON compressé ; les **14 plus récentes** sont conservées.
- Bouton « Sauvegarder maintenant », liste des sauvegardes (date, taille) et téléchargement (lien valable 1 h).
- Il n'existe **pas d'outil de restauration** : c'est une opération manuelle, volontairement non exposée.
- La sauvegarde couvre les données, pas la structure (celle-ci vit dans les migrations du dépôt).

### 4.5 bis Documents PDF à imprimer

Sur la vue d'ensemble d'un tournoi, deux boutons génèrent un PDF **A4, en français, heures de Paris, lisible en noir et blanc**, produit côté serveur sans service externe. Réservés aux admins.

- **Dossier d'organisation (PDF)**, disponible à tout moment, une section par page :
  1. **Couverture** : nom du tournoi, club, date en lettres, format de match en toutes lettres (par défaut et par phase), nombre d'équipes, poules, qualifiés, terrains utilisés, ordre de départage.
  2. **Composition des poules**, avec les noms complets des deux joueurs de chaque équipe.
  3. **Calendrier complet** : un tableau par créneau horaire, une colonne par terrain, plus une colonne **Repos** qui indique l'équipe exempte de chaque tour de poule ; la phase finale y figure aussi, avec la provenance des équipes inconnues.
  4. **Feuilles de score vierges** (paysage) : une ligne par match, avec des cases set par set selon le format de la phase (tie-break, super tie-break), un rappel du départage et de la règle d'égalité au buzzer en bas de page.
  5. **Grilles de classement vierges**, une par poule : Équipe, Victoires, Jeux gagnés, Jeux perdus, Différence, Rang.
  6. **Arbre du tableau final vierge** (paysage), dimensionné selon le nombre de qualifiés, avec les cases pour la 3e place (et la 5e place quand elle existe).
  Si les poules ou le calendrier n'existent pas encore, la section concernée l'indique au lieu de bloquer la génération.
- **Résultats (PDF)**, **disponible une fois le tournoi « Terminé »** (bouton inactif avant ; le serveur refuse aussi) : classements de poule remplis avec les scores des matchs, tableau final rempli, classement final. C'est le document à envoyer au club après le tournoi.

Aucune donnée de contact (e-mail, téléphone) n'entre dans ces documents : seuls les noms des joueurs y figurent.

### 4.6 Format & règles (onglet du tournoi, admin)

Trois sections, chacune avec son bouton d'enregistrement :

1. **Format de match par défaut** : nombre de sets gagnants (1 ou 2), jeux pour gagner, écart requis, point décisif à 40-40 (et choix du côté par le receveur), jeu décisif (activé, seuil de déclenchement, points, écart), super tie-break (et ses points), limite de temps (durée, règle de fin : le leader gagne / on termine le jeu, et **égalité au buzzer** : point en or / jeu décisif / nul interdit), durée estimée. Les réglages sans objet sont masqués : pas de réglage de tie-break s'il est désactivé, pas de règle de fin sans limite de temps, pas de choix du receveur sans point décisif. À un seul set, l'option devient « match joué en super tie-break seul » ; à 2 sets, « set décisif joué en super tie-break ». Un **résumé en français** est affiché en permanence (ex. « 1 set en 7 jeux, point décisif, tie-break en 7 points à 6-6, limité à 25 min (le leader gagne) »). **Quatre préréglages** en un clic : Tournoi amical (1 set en 7 jeux), Format court (2 sets en 4 jeux + super tie-break de 10 points), FFT B1 (2 sets en 6 jeux + super tie-break de 10 points), Super tie-break seul.
2. **Format par phase** : pour Poules, Quarts de finale (et tours antérieurs), Demi-finales, Finale et Matchs de classement (3e et 5e place), chaque ligne est « identique au format par défaut » ou a **son propre format** (même formulaire). Le réglage est conservé au niveau du tournoi et recopié sur les matchs **pas encore commencés** — y compris ceux générés plus tard (calendrier, tableau final, régénération).
3. **Ordre de départage des poules** : liste réordonnable par glisser-déposer (ou flèches), avec activation/désactivation de chaque critère. « Victoires » reste figé en premier. Des **avertissements** signalent les critères qui ne départageront rien avec le format choisi (différence / ratio de sets avec un seul set gagnant) ou qui seront faussés (critères de jeux avec un super tie-break, dont les points comptent comme des jeux).

Validation (identique à l'écran et au serveur) : le seuil du tie-break ne peut pas dépasser le nombre de jeux pour gagner ; l'écart requis ne peut pas dépasser ce nombre ; une limite de temps exige une règle de fin ; un super tie-break exige son nombre de points ; au moins un critère de départage, sans doublon.

**Verrouillage** : un champ se verrouille avec la raison affichée dès que des matchs concernés ont commencé (score saisi, validé ou forfait). Une phase commencée ne peut plus changer de format ; le format par défaut se verrouille si une phase commencée l'utilise (on peut alors donner un format propre aux phases à venir) ; l'ordre de départage se verrouille dès le premier match de poule joué. Les phases pas encore commencées restent modifiables. Chaque modification est tracée dans le journal d'audit (avant / après).

## 5. Inscriptions

### 5.1 Inscription en ligne (page publique du tournoi publié)

Le participant doit être connecté (sinon la page propose « Se connecter » / « Créer un compte »). Deux modes :
- **En paire** : il saisit prénom, nom et **e-mail obligatoire** du partenaire. Si une fiche existe avec cet e-mail **et** le même nom et prénom, elle est réutilisée (compte existant ou fiche sans compte laissée par une inscription précédente) ; sinon une fiche est créée. Un e-mail seul ne suffit jamais à rattacher quelqu'un. L'équipe est nommée « Prénom Nom / Prénom Nom ».
- **Seul(e)** : inscription solo ; le club l'associera à un autre joueur seul.

Garde-fous : le tournoi doit être publié ; on ne peut pas être inscrit deux fois (solo ou équipe) ; on ne peut pas s'inscrire avec soi-même comme partenaire ; le partenaire ne doit pas déjà être inscrit.

Toute inscription en ligne est **« en attente de validation par le club »**. Le participant voit l'état de son inscription (en attente / confirmée) sur la page du tournoi et dans son historique.

**E-mail à l'organisateur** : à chaque inscription en ligne (solo ou paire), tous les comptes administrateurs reçoivent un e-mail (qui, avec qui, places occupées, lien vers l'écran Inscriptions). Il part après la réponse au participant : un envoi qui échoue (service d'e-mail non configuré ou en panne) est journalisé mais ne bloque jamais l'inscription. Il utilise la même configuration que les rappels (`RESEND_API_KEY`, `RESEND_FROM`).

**Annulation par le participant** : sur la page du tournoi et dans « Mes tournois », un bouton « Annuler mon inscription » (avec confirmation) est proposé **jusqu'à 48 h avant le début du tournoi** (date + heure de début, heure de Paris), tant que le tournoi est publié ; passé ce délai, un message renvoie vers l'organisateur. Une inscription solo est supprimée ; pour une **paire** (ou un joueur seul que le club a déjà placé en équipe), l'équipe entière est annulée (le/la partenaire est prévenu(e) par e-mail). Si le **tirage est déjà fait**, l'annulation en ligne est refusée (l'équipe est placée en poule) et l'organisateur s'en charge. Chaque annulation est tracée dans le journal d'audit et prévient les administrateurs par e-mail ; la place libérée est immédiatement disponible.

### 5.2 Inscription par l'admin (`Inscriptions`)

- **Ajouter une paire** : chaque joueur est soit repris d'une fiche existante (recherche parmi tous les joueurs connus, hors joueurs déjà inscrits au tournoi), soit saisi à la main (prénom, nom, sexe H/F, classement FFT comme « 15/1 »). L'équipe est **validée d'emblée**.
- **Inscrire un joueur seul** (en attente de validation).
- **Valider un joueur seul sans lui attribuer d'équipe** : une inscription solo passe de « à valider » à « validée, en attente d'un binôme » (boutons Valider / Refuser, puis Retirer pour un joueur déjà validé). Le joueur reste dans la liste des joueurs seuls, compte dans les places, et son statut visible côté joueur devient « Inscription validée, en attente d'un binôme ».
- **Valider** une équipe en attente, **renommer**, **supprimer** une équipe, **modifier** la fiche d'un joueur, **remplacer** un joueur d'une équipe.
- **Générer des équipes** à partir des joueurs seuls (à valider ou déjà validés, sans équipe), selon une stratégie : **Aléatoire**, **Équilibré (par classement)** (le classement FFT saisi en texte — « 15/1 », « 30/2 », « NC »… — est converti selon l'échelle officielle, de -30 jusqu'à NC ; un classement vide ou non reconnu est classé tout en bas sans bloquer), **Mixte forcé (H/F)**. Les équipes créées sont validées. Un joueur qui reste sans partenaire (nombre impair, ou contrainte non satisfiable) est **signalé, jamais supprimé**.
- Seules les équipes **validées** participent au tirage.

### 5.3 Compte participant (`/compte`)

- **Création de compte** : e-mail, mot de passe (8 caractères minimum), nom, prénom, sexe, téléphone, classement FFT. Si une **fiche sans compte** correspond (créée par un partenaire ou un admin), l'application demande confirmation (« c'est bien moi ») avant de la rattacher, pour ne pas perdre l'historique ; une correspondance exacte e-mail + nom + prénom pour un compte déjà authentifié rattache automatiquement.
- **Connexion**, **mot de passe oublié** (lien par e-mail, disponible aussi côté admin), déconnexion.
- **Profil** : nom, prénom, sexe, téléphone, classement, et **canal de rappel préféré** (e-mail ou WhatsApp).
- **Historique** : ses tournois (à venir / en cours / terminés), partenaire ou statut d'inscription.

### 5.4 Limite de places

Le tournoi peut fixer un **nombre maximum de joueurs** (vide = illimité). L'unité est le **joueur** : une paire compte pour 2, un solo pour 1 (16 joueurs = 8 paires).
- Sont comptés : les membres des équipes (validées ou en attente) et les joueurs seuls sans équipe (à valider ou validés) ; un joueur n'est compté qu'une fois.
- Le visiteur et l'inscrit voient « N places restantes », « 1 place restante » ou « Complet » dans la carte d'inscription.
- Complet : plus de formulaire. Une seule place : seule l'inscription en solo est proposée.
- Le serveur refuse l'inscription (pas seulement l'affichage) et, si deux inscriptions simultanées se disputent la dernière place, annule celle qui dépasse.
- **Les ajouts faits par l'admin ne sont jamais bloqués** par la limite ; la page Inscriptions affiche le compteur. Baisser la limite sous le nombre d'inscrits n'annule personne.

## 6. Poules et tirage

### 6.1 Répartition

- Minimum **4 équipes par poule** (garantit 3 matchs par équipe), taille cible 4 ou 5, maximum 7.
- Le nombre de poules est choisi automatiquement : parmi les répartitions équilibrées valides, celle qui compte le moins de poules hors de la taille cible, puis le plus petit écart de taille. Avec 6 ou 7 équipes, la poule unique est la seule option : un avertissement signale le nombre de matchs (ex. 21 pour 7).
- **L'admin peut forcer le nombre de poules.** Dans ce cas, une poule de **3 équipes** est acceptée (ex. 7 équipes en 2 poules : 4 + 3 ; chaque équipe de la poule de 3 ne joue alors que 2 matchs) ; en dessous de 3, c'est refusé.
- Moins de 4 équipes validées : pas de tirage.

### 6.2 Tirage

- Les **têtes de série** (numéro de seed saisi sur les équipes) sont réparties une par poule en serpentin ; le reste est tiré au sort.
- Le tirage est **reproductible** : sa graine est mémorisée et affichée pour pouvoir le rejouer à l'identique en cas de contestation.
- Relancer le tirage supprime les poules et le calendrier existants ; il est **interdit dès qu'un score de poule a été saisi**.

## 7. Calendrier

### 7.1 Tours

Chaque poule joue en tournante complète (algorithme du cercle) : poule de 4 = 3 tours / 6 matchs ; poule de 5 = 5 tours / 10 matchs avec **une équipe exempte par tour** (la liste des exempts est affichée).

### 7.2 Placement sur les terrains

À partir d'une heure de début, d'une durée de jeu, d'un temps de rotation et d'un **repos minimum** entre deux matchs d'une même équipe, l'application place les matchs sur les terrains du tournoi (algorithme glouton : aucune équipe sur deux terrains à la fois, repos respecté, alternance des poules, terrains remplis avant d'ouvrir un nouveau créneau). Le résultat n'est pas optimisé : il se retouche à la main.

### 7.3 Ajustement manuel

L'admin peut déplacer un match vers un autre terrain / créneau. Les conflits sont détectés en direct : **même terrain occupé deux fois**, **équipe convoquée deux fois en même temps**, **repos insuffisant**.

La régénération du calendrier est interdite dès qu'un score de poule est saisi. La phase finale est planifiée aussi (§7.4).

### 7.4 Phase finale

À la génération du tableau (automatique en fin de poules, ou depuis « Modifier les qualifiés »), tous ses matchs reçoivent un **terrain et un horaire**, **même quand leurs équipes sont inconnues** : on réserve un créneau pour « le quart de finale n°3 », et l'affiche se remplit à la validation du tour précédent. Le placement est contraint par la structure du tableau, pas par les équipes :
- la phase finale démarre **à la suite des poules** ;
- **tous les matchs d'un tour avant tous ceux du tour suivant** (tous les quarts avant toutes les demies, toutes les demies avant la finale), avec le **repos minimum** du tournoi entre deux tours ;
- les équipes déjà connues (quarts, match pour la 5e place) respectent aussi le repos depuis leur dernier match de poule ;
- les terrains sont remplis avant d'ouvrir un nouveau créneau ;
- le **match pour la 5e place** se joue en parallèle des demi-finales si un terrain est libre ; le **match pour la 3e place** se joue avec la finale (ses équipes ne sont connues qu'après les demies, il ne peut pas être placé avant).

La grille du calendrier affiche la phase finale avec les poules ; une case dont l'équipe est inconnue indique sa provenance (« Vainqueur du quart n°1 », « Perdant de la demi n°2 »). Le glisser-déposer et la détection de conflits s'appliquent : en plus des conflits des poules, le calendrier signale **un match placé avant (ou sans le repos minimum après) le match qui l'alimente**. Le bouton **Replanifier le tableau final** refait le placement automatique (en effaçant les ajustements manuels, après confirmation). **Dès qu'un match du tableau est validé** (ou forfait), le calendrier de la phase finale est figé : plus de déplacement ni de replanification.

## 8. Scores

### 8.1 Format de match

Format par défaut : **1 set de 7 jeux**, écart requis 1, **point décisif** à 40-40, **jeu décisif à 7 points à 6-6** (écart 2), limite de temps 25 min avec règle « le leader gagne » à l'expiration, durée estimée 25 min, **égalité au buzzer départagée par un point en or**. Le format est paramétrable par tournoi et par phase (§4.6). Lors de la saisie d'un score, le set décisif d'un format à super tie-break se saisit en points (sans tie-break à l'intérieur). Les scores sont toujours stockés set par set, jamais en texte.

### 8.2 Saisie et validation

**Égalité au buzzer** : quand le temps limite est écoulé sur une égalité (ex. 4-4), le scoreur saisit le départage prévu par le format — le gagnant du point en or, le score du jeu décisif, ou l'équipe désignée vainqueur si le nul est interdit. Le formulaire propose ce départage dès qu'il voit une égalité, et le message de refus à la validation dit précisément quoi saisir ; il n'y a donc jamais de match impossible à valider. Sans limite de temps, une égalité n'est pas une fin de set (on continue de jouer, ou on déclare forfait). Les jeux restent à égalité (4-4) dans les statistiques ; l'équipe qui gagne le départage gagne le set.

Pour chaque match, on saisit les jeux de chaque set (et le tie-break le cas échéant) puis on **enregistre** (statut « saisi »), puis on **valide** (statut « validé »). Le vainqueur est calculé d'après le format ; un score qui ne désigne pas de vainqueur clair ne peut pas être validé (un 5-4 au buzzer reste valide avec la règle « leader gagne »).

Statuts d'un match : à venir → prêt → en cours → saisi → validé / forfait.

- **Corriger** un match validé (les anciens sets sont conservés dans le journal d'audit). Pour un **match de poule dont le tableau final existe déjà**, la correction est d'abord comparée à la liste des qualifiés (l'ensemble des équipes qualifiées) : classements actuels contre classement recalculé avec la correction.
  - **Liste inchangée** (y compris si le classement change sans toucher aux qualifiés, par exemple le 3e et le 4e qui s'échangent sans être qualifiés) : correction appliquée normalement, tracée dans le journal.
  - **Liste modifiée, aucun match du tableau joué** : correction appliquée, **tableau régénéré automatiquement** (planning compris), avec un bandeau « le tableau a été régénéré suite à la correction » sur le match corrigé et sur l'écran Tableau final ; trace dans le journal (équipes entrantes et sortantes).
  - **Liste modifiée, au moins un match du tableau commencé** (score saisi, validé ou forfait) : correction **refusée**, avec un message qui nomme les équipes qui entreraient et sortiraient du tableau et précise que seul un retour en arrière manuel sur le tableau (réinitialiser ses matchs joués) permet de corriger ; le refus est tracé.
  - Le même contrôle s'applique à un forfait déclaré sur un match de poule. Un tableau dont les qualifiés ont été choisis à la main (§11.2) n'est jamais régénéré par une correction : le choix de l'organisateur prime. Un simple échange de rang entre deux qualifiés ne change pas la liste et ne régénère rien.
- **Forfait** : l'admin désigne l'équipe gagnante ; le match compte comme une victoire sans jeux ni sets.
- **Réinitialiser** un score : remet le match à venir. Bloqué si le tour suivant a déjà commencé. Pour un match de poule, bloqué dès que le tableau final a commencé ; autorisé tant que rien n'y a été joué (l'admin peut alors régénérer les qualifiés).
- Chaque validation, correction et réinitialisation est tracée (qui, quoi, quand).
- Admins **et** scoreurs saisissent et valident les scores. Les pages publiques se rafraîchissent en direct.

## 9. Classement de poule

Une victoire fait gagner le match ; le classement trie d'abord par **nombre de victoires**, puis applique les critères de départage dans l'ordre configuré du tournoi. Ordre par défaut :

1. **Victoires**
2. **Confrontation directe** (uniquement quand exactement 2 équipes sont à égalité)
3. **Mini-classement** (uniquement quand 3 équipes ou plus sont à égalité : leurs victoires entre elles)
4. **Ratio de sets** (sets gagnés / sets joués)
5. **Ratio de jeux** (jeux gagnés / jeux joués)

La chaîne est **réentrante** : dès qu'un critère sépare un groupe d'égalité en plusieurs sous-groupes, chaque sous-groupe repart du premier critère. Par exemple, trois équipes à égalité dont le ratio de jeux n'en isole qu'une : les deux restantes se départagent alors par leur confrontation directe. Un groupe qu'aucun critère ne sépare reste ex æquo (même rang). Ce défaut s'applique aux nouveaux tournois ; un tournoi existant garde l'ordre qu'il a déjà.

Critères disponibles dans le moteur : victoires, confrontation directe, mini-classement (3 équipes ou plus à égalité), différence ou ratio de sets, différence ou ratio de jeux. Un critère qui ne départage personne parmi les équipes encore à égalité est ignoré et on passe au suivant (ce qui neutralise d'office la différence de sets en format 1 set, toujours égale à ±1). Aucune règle de départage n'est codée en dur dans les écrans.

Le classement est recalculé à chaque validation, correction, forfait ou réinitialisation d'un match de poule.

## 10. Qualification pour le tableau final

- Taille du tableau = plus grande **puissance de 2** inférieure ou égale au nombre d'équipes, plafonnée par le **nombre de qualifiés** du tournoi (ex. 14 équipes, 8 qualifiés → tableau de 8 ; 2 poules de 4 avec 4 qualifiés → tableau de 4).
- Les qualifiés sont pris **rang par rang** à travers les poules (tous les 1ers, puis les 2es…). Quand un rang ne passe qu'en partie (ex. « les 2 meilleurs 3es »), les équipes de ce rang sont départagées **uniquement par ratios** (victoires/matchs joués, puis ratio de sets, puis de jeux), jamais par différences absolues, pour rester équitable entre poules de tailles différentes.
- S'il manque des équipes qualifiables, un avertissement est affiché.
- Une poule unique n'a pas de tableau : le classement de poule est le classement final.

## 11. Tableau final

### 11.1 Génération automatique

Le tableau est **généré automatiquement dès que le dernier match de poule est validé** (ou déclaré forfait), sans clic. Il est placé par **seeding standard** (1-8, 4-5, 2-7, 3-6…) avec la contrainte que **deux équipes de la même poule ne se rencontrent pas au premier tour** (permutation corrective ; si aucune ne convient, l'admin tranche à la main). Les vainqueurs sont propagés automatiquement vers le tour suivant.

### 11.2 Repêchage / modification des qualifiés (admin)

Sur l'écran **Tableau final**, « Modifier les qualifiés » montre toutes les équipes par poule avec leur rang, cochées selon la sélection automatique. L'admin peut échanger des équipes (le nombre doit rester celui du tableau) puis **régénérer** le tableau. C'est impossible dès qu'un match du tableau a été joué. Le scoreur ne voit jamais ce panneau.

Un **bandeau d'alerte permanent** s'affiche sur l'écran Tableau final quand les qualifiés du tableau ne correspondent plus au classement des poules (par exemple après une réinitialisation de score de poule, ou pour un tournoi corrigé avant ce garde-fou) : il nomme les équipes concernées et indique la marche à suivre (régénérer depuis « Modifier les qualifiés » si rien n'est joué, sinon retour en arrière manuel). Les sélections choisies à la main ne déclenchent pas ce bandeau.

### 11.3 Match pour la 3e place

Dès qu'il y a des demi-finales (4 qualifiés ou plus), un **match pour la 3e place** est créé à côté du tableau : il oppose les deux **perdants des demi-finales**, propagés automatiquement à la validation de chaque demi. Il apparaît sur l'écran Tableau final et sur la page publique. Réinitialiser une demi-finale est refusé si la petite finale a commencé.

### 11.4 Match de classement pour la 5e place

Cas particulier : quand le tournoi compte **exactement 2 poules**, que **le 3e de chaque poule n'est pas qualifié** (typiquement 2 poules de 4 avec un tableau de 4) et que le tournoi dispose d'**au moins 3 terrains assignés**, un match est créé automatiquement entre les **deux 3es de poule**. Les deux équipes sont connues dès la fin des poules : ce match peut se jouer **en parallèle des demi-finales**, sur le terrain libre. Il suit le même cycle que le tableau (régénéré et bloqué avec lui). Au-delà de 2 poules, ce mécanisme ne s'applique pas.

## 12. Classement final

Calculé et affiché (admin et public) une fois la finale validée :

1. Vainqueur de la finale ; 2. Finaliste.
3. **3e et 4e** : départagés par le match pour la 3e place une fois joué ; tant qu'il ne l'est pas (ou pour un tableau de 2), les deux demi-finalistes battus sont **3es ex æquo**.
4. Perdants de quarts (s'il y en a), classés par ratios.
5. **Match pour la 5e place** (si joué) : vainqueur 5e, perdant 6e.
6. Équipes non qualifiées restantes, classées par ratios.

Une poule unique : classement final = classement de poule. Le **cumul de jeux gagnés sur tout le tournoi** est tenu à jour dès le premier match validé.

## 13. Rappels de match

Un onglet **Rappels** par tournoi liste les **matchs à venir ayant un horaire** — poules **et phase finale** — avec les joueurs des deux équipes. Un match de tableau n'est rappelable que lorsque ses deux équipes sont connues ; le message mentionne alors la phase (« demi-finale n°1 »).

- **Canal par joueur** : e-mail (par défaut) ou WhatsApp, modifiable par l'admin avec saisie de l'e-mail ou du numéro (utile pour les joueurs sans compte) ; le joueur peut aussi choisir son canal dans son profil. Les numéros français locaux (06…) sont convertis au format international.
- **Message** : prénom, tournoi, adversaires, date et heure (Europe/Paris), terrain.
- **Envoi manuel** : e-mail via le service d'envoi ; WhatsApp au choix **par lien** (WhatsApp s'ouvre avec le message prêt, l'admin envoie lui-même) ou **par API** (envoi automatique). Un bouton prévient d'un coup tous les joueurs pas encore rappelés des matchs des N prochaines heures (WhatsApp y passe toujours par l'API).
- **Un seul rappel par joueur et par match** : l'écran indique « Envoyé » avec canal, origine (manuel / automatique) et date ; on peut renvoyer. Un joueur sans contact valable donne une erreur sans bloquer les autres.
- **Envoi automatique (cron)** : réglage global (tous tournois) **désactivé par défaut**, avec délai en heures (1 à 72, 24 par défaut). Une fois activé, la tâche planifiée envoie e-mails et WhatsApp (API) aux matchs dans le délai. La fréquence actuelle est **quotidienne** (7 h UTC), limite du plan d'hébergement ; elle se resserre en changeant le planning.
- Seuls les matchs encore « à venir / prêt » avec un horaire et les deux équipes connues sont rappelés.

## 14. Pages publiques

- **Accueil** : tournois publiés, en cours et terminés (en cours d'abord, puis à venir par date croissante, puis terminés du plus récent).
- **Page d'un tournoi** (`/t/<lien>`) : en-tête (nom, date, niveau, statut), carte d'inscription avec places restantes, classement final si disponible, chaque poule (classement + matchs avec scores, terrain et heure), tableau final avec match pour la 3e place et pour la 5e place, chaque case affichant terrain et heure — et, tant qu'une équipe est inconnue, sa provenance (« Vainqueur du quart n°1 »). **Mise à jour en direct** (sans recharger) à chaque score validé.
- Une poule unique affiche directement son classement comme classement final.

## 15. Données et sécurité (résumé)

- Données dans Supabase (Postgres, authentification, temps réel) ; sécurité au niveau des lignes : le public ne lit que ce qui concerne les tournois publiés, en cours ou terminés ; le détail des inscriptions et des compositions d'équipes n'est lisible que par les admins (les pages publiques passent par des accès serveur contrôlés).
- Connexion admin par e-mail + mot de passe ; le lien envoyé par e-mail ne sert qu'à activer un compte ou réinitialiser un mot de passe, jamais à se connecter au quotidien. L'inscription libre côté fournisseur d'authentification est désactivée : les comptes se créent via l'application.
- Les pages publiques ne lisent que des **colonnes explicites** (jamais de `select *`) et ne reçoivent ni e-mail, ni téléphone, ni canal de rappel, ni identifiant de compte : un test échoue si l'une de ces clés apparaît, et la page plante plutôt que de servir une donnée privée.
- Heures affichées et saisies en **heure de Paris**, quel que soit le fuseau de la machine.
- Les tâches planifiées exigent un secret partagé ; les envois de rappels et les sauvegardes ne sont jamais déclenchables sans lui.
- Fonctionnement interne : toute la logique de tournoi (répartition, tirage, tours, planification, scores, classements, qualification, tableau) est un moteur de fonctions pures, couvert par une suite de tests dont un scénario de référence de **14 équipes** (poules 5/5/4, tableau de 8) rejoué de bout en bout.

## 16. Hors périmètre

- Paiement des inscriptions.
- Optimisation du calendrier (le placement glouton + ajustement manuel suffit).
- Matchs de classement au-delà de la 3e et 5e place (pas de tableau de consolation complet).
- Rappels de date de tournoi (seuls les rappels de match existent).
- Format de match propre à un seul match (le réglage se fait par phase).
- Outil de restauration d'une sauvegarde.
- Remboursement / liste d'attente automatique quand une place se libère (une équipe supprimée libère simplement des places).

## Annexe — Principales données

| Table | Rôle |
|---|---|
| `clubs`, `courts`, `tournament_courts` | Clubs, leurs terrains, terrains retenus par tournoi |
| `tournaments` | Tournoi : paramètres, statut, lien public, format de match, ordre de départage, nb. de qualifiés, limite de joueurs |
| `players` | Fiches joueurs (avec ou sans compte), canal de rappel |
| `teams`, `team_players` | Équipes (statut en attente / validée) et leurs 2 joueurs |
| `registrations` | Inscriptions (paire ou solo, statut) |
| `groups`, `group_teams` | Poules et leur composition (position de tirage) |
| `matches`, `match_sets` | Matchs (phase poule / tableau / classement 3e place / classement 5e place, terrain, horaire, vainqueur, propagation) et scores par set |
| `standings` | Classements de poule |
| `memberships` | Rôles : admin (global) ou scoreur (rattaché à un tournoi) |
| `audit_log` | Journal des validations, corrections, réinitialisations |
| `rappels_envoyes`, `parametres_rappels` | Rappels déjà envoyés ; réglage du cron |
