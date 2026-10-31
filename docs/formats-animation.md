# Formats d'animation — architecture et feuille de route

Ajouter Americano, Mexicano, montée-descente et TMC à PadelMeet Tournois.

---

## 1. Mon avis d'abord

**C'est le bon moment, et c'est aussi le changement le plus risqué du projet.** Ton moteur actuel repose sur quatre hypothèses implicites : les binômes sont fixes, un match oppose deux équipes, le calendrier est connu d'avance, et on classe des équipes. L'Americano casse trois de ces quatre hypothèses. Si tu le greffes à coups de `if format === 'americano'`, tu abîmes le moteur qui marche.

**La bonne approche est l'inverse d'une refonte :** tu déclares ton format actuel comme *une stratégie parmi d'autres*, sans toucher à son code, et tu ajoutes les autres à côté derrière une interface commune. Le jour où un format tourne mal, il n'y a qu'un fichier à regarder.

**Ne les fais pas tous d'un coup.** Commence par l'Americano seul. Il représente l'essentiel de la demande en animation de club, et surtout il **force à lui seul toute l'abstraction** : classement individuel, partenaires tournants, score en points. Une fois qu'il tourne, le Mexicano est une journée de travail — même moteur, seule la fonction d'appariement change. La montée-descente, pareil.

**Un point que tu as peut-être déjà en tête :** l'Americano est précisément le format qu'il faut pour les tournois débutants que tu animes en club. Personne n'est éliminé, tout le monde joue du début à la fin, les niveaux se mélangent, et ça tient sur une soirée. Si tu ne devais en ajouter qu'un, c'est celui-là.

**Le vrai risque n'est pas technique, il est ergonomique.** Un Americano se pilote au bord du terrain, sur un téléphone, entre deux manches, avec du bruit autour. L'écran qui compte n'est pas la configuration, c'est **« tour 4 sur 7, voici qui joue où, saisis les scores »**. Si cet écran demande plus de trois gestes par manche, tu reviendras au papier.

---

## 2. Les deux axes qui classent tous les formats

Tout se range sur deux dimensions. C'est ce qui permet une interface commune plutôt qu'une pile de cas particuliers.

**Unité de classement** — on classe des équipes, ou des joueurs.
**Calendrier** — tout est généré d'avance (statique), ou chaque tour dépend des résultats du précédent (dynamique).

| Format | Unité | Calendrier | Partenaire | Score |
|---|---|---|---|---|
| **Poules + tableau** *(existant)* | équipe | statique | fixe | jeux/sets |
| **Poule unique** *(existant)* | équipe | statique | fixe | jeux/sets |
| **Americano** | joueur | statique | tournant | points |
| **Team Americano** | équipe | statique | fixe | points |
| **Mexicano** | joueur | dynamique | tournant | points |
| **Mixicano** | joueur | statique | tournant (H/F) | points |
| **Montée-descente individuelle** | joueur | dynamique | tournant | points |
| **Montée-descente par paires** | équipe | dynamique | fixe | points ou jeux |
| **TMC (multi-chances)** | équipe | dynamique | fixe | jeux/sets |

Les formats **dynamiques** ont une conséquence lourde : on ne peut pas publier le calendrier de la journée, seulement le tour suivant. Ça touche la planification, les rappels et la page publique.

---

## 3. Les formats, en une phrase chacun

**Americano.** À chaque tour on change de partenaire et d'adversaires. Chaque manche se joue à un nombre de points fixe (16, 21, 24 ou 32), au point décisif, et s'arrête net au total prévu. Chacun cumule les points marqués par son camp, indépendamment de son partenaire. Classement individuel. Idéal avec un multiple de 4 joueurs ; 1h30 à 3h de jeu.

**Team Americano.** Même principe en binôme fixe : les paires tournent les adversaires, le classement est par équipe. C'est l'Americano pour ceux qui viennent à deux.

**Mexicano.** Americano dont les appariements dépendent du classement provisoire : après chaque tour on reclasse, les quatre premiers se retrouvent sur le terrain 1, les suivants sur le terrain 2, et ainsi de suite. Les matchs se resserrent au fil de la soirée. Calendrier dynamique par construction.

**Mixicano.** Americano mixte : autant d'hommes que de femmes, et chaque paire est forcément mixte. Très demandé en animation de club.

**Montée-descente.** Les terrains sont numérotés. Après chaque manche courte (7 à 12 minutes), les gagnants montent d'un terrain, les perdants descendent. En quelques tours, chacun se retrouve à son niveau du jour. Se joue en paire fixe ou en changeant de partenaire à chaque rotation. Format d'animation par excellence, jamais homologué.

**TMC — tournoi multi-chances.** Binôme fixe, mais une défaite n'élimine pas : on bascule vers un tableau de consolante, parfois un troisième niveau. Plusieurs vainqueurs, un par tableau. C'est le seul de la liste qui **peut être homologué FFT** et rapporter des points au classement — les autres sont des animations conviviales.

---

## 4. Architecture

### 4.1 Le principe : une stratégie par format

```ts
// lib/engine/formats/types.ts
export interface FormatAnimation {
  code: CodeFormat
  nom: string
  description: string

  uniteClassement: 'equipe' | 'joueur'
  calendrier: 'statique' | 'dynamique'
  partenaire: 'fixe' | 'tournant'
  modeScore: 'jeux_sets' | 'points'
  aUnTableauFinal: boolean

  /** Nombre d'inscrits acceptable, et message d'aide si non. */
  validerEffectif(n: number, terrains: number): Validation

  /** Statique : tous les tours d'un coup. Dynamique : le tour suivant uniquement. */
  genererTours(etat: EtatTournoi): Tour[]

  /** Appelée après chaque validation de score : un tour de plus, ou rien. */
  tourSuivant(etat: EtatTournoi): Tour | null

  classement(etat: EtatTournoi): LigneClassement[]
  estTermine(etat: EtatTournoi): boolean
}
```

Le format existant devient `formats/poulesTableau.ts` et **son code n'est pas modifié** : on l'enveloppe dans cette interface. C'est la seule garantie de ne rien casser.

Un registre `formats/index.ts` expose `getFormat(code)`. Les écrans et les routes ne connaissent jamais un format en particulier : ils demandent au registre.

### 4.2 Le changement de schéma minimal

La tentation serait de remplacer `matches.team_a_id / team_b_id` par une table de participants. **Ne le fais pas** : ça réécrit la moitié du système pour un gain nul.

La bonne astuce : en Americano, une paire éphémère **est une équipe**, qui ne vit qu'un tour.

```sql
-- Équipes éphémères : créées par tour, invisibles des inscriptions
ALTER TABLE teams ADD COLUMN ephemere boolean NOT NULL DEFAULT false;
ALTER TABLE teams ADD COLUMN tour_origine integer;

-- Format d'animation du tournoi
ALTER TABLE tournaments ADD COLUMN format_animation text NOT NULL DEFAULT 'poules_tableau';
ALTER TABLE tournaments ADD COLUMN config_animation jsonb NOT NULL DEFAULT '{}';

-- Classement individuel, à côté de standings (équipes), pas à la place
CREATE TABLE standings_joueurs (
  tournament_id uuid, player_id uuid,
  manches_jouees int, victoires int,
  points_marques int, points_encaisses int, difference int,
  tours_exempt int, rang int
);
```

`matches`, `match_sets`, la saisie des scores, l'audit et le temps réel : **inchangés**. C'est ce qui rend ce lot faisable en quelques jours plutôt qu'en quelques semaines.

### 4.3 Le score en points

Le `MatchFormat` du lot 8 gagne un mode :

```ts
modeScore: 'jeux_sets' | 'points'
points_cible: number        // 16, 21, 24, 32
somme_exacte: boolean       // true : a + b doit valoir exactement points_cible
```

En mode points, la saisie se réduit à **un seul champ** : les points d'un camp, l'autre se déduit. C'est le geste le plus rapide possible, et c'est exactement ce qu'il faut au bord du terrain. Si la manche est limitée par le temps plutôt que par le total, `somme_exacte` passe à `false` et les deux champs sont saisis.

### 4.4 Le classement individuel

Critères, dans l'ordre, configurables comme ceux des poules :

1. Points marqués (total cumulé)
2. Différence (marqués − encaissés)
3. Nombre de manches gagnées
4. Confrontation directe sur les manches jouées ensemble
5. Moins de tours d'exemption

Les joueurs n'ayant pas joué le même nombre de manches (effectif non multiple de 4), un mode **« points par manche »** doit être proposé en alternative au total brut. Sans lui, le joueur qui a été exempté deux fois est injustement pénalisé.

### 4.5 L'algorithme de rotation Americano — vérifié

Appariement glouton minimisant d'abord les partenariats répétés, ensuite les adversaires répétés, avec répartition équitable des exemptions. Résultats mesurés :

| Joueurs | Terrains | Tours | Partenariats différents | Répétitions | Exemptions |
|---|---|---|---|---|---|
| 8 | 2 | 7 | 28 / 28 | **0** | aucune |
| 12 | 3 | 7 | 66 / 66 | **0** | aucune |
| 16 | 4 | 7 | 120 / 120 | **0** | aucune |
| 10 | 2 | 8 | 45 / 45 | 1 | équilibrées (1 ou 2 par joueur) |
| 6 | 1 | 6 | 15 / 15 | 1 | 2 par joueur |

À 8 joueurs sur 7 tours, **chacun joue exactement une fois avec chacun des sept autres** — l'Americano parfait. Le coût de calcul reste négligeable jusqu'à une quarantaine de joueurs ; au-delà, il faut passer sur une construction combinatoire plutôt que gloutonne. Prévoir un garde-fou.

### 4.6 L'appariement Mexicano

Tour 1 : aléatoire, ou par niveau si les classements sont renseignés.
Tours suivants : on reclasse, puis les joueurs 1 à 4 vont sur le terrain 1, 5 à 8 sur le terrain 2, etc. Sur chaque terrain, l'appariement est **1+4 contre 2+3**, ce qui équilibre la manche. Variante configurable : 1+3 contre 2+4. Une contrainte secondaire évite de rejouer avec le même partenaire deux tours de suite quand c'est possible.

### 4.7 La montée-descente

Terrain 1 = terrain du haut. Après chaque manche : les deux gagnants montent d'un terrain, les deux perdants descendent. Les joueurs du terrain 1 qui gagnent y restent, ceux du dernier terrain qui perdent y restent. Deux variantes à exposer :

- **paire fixe** : le binôme monte ou descend ensemble ;
- **individuelle** : les quatre joueurs d'un terrain recomposent leurs paires à chaque tour (classiquement, les deux arrivants jouent ensemble).

Classement : points cumulés, ou nombre de tours passés sur le terrain du haut — à choisir dans la configuration.

---

## 5. Conséquences sur les modules existants

À traiter explicitement, sinon ce sont autant de bugs le jour de la première animation.

| Module | Conséquence |
|---|---|
| **Inscriptions** | En Americano, l'inscription individuelle devient la norme et l'inscription en paire doit être masquée. En Mixicano, il faut compter les hommes et les femmes séparément, et bloquer le déséquilibre. |
| **Limite de places** | L'unité reste le joueur, mais l'effectif idéal est un multiple de 4 : afficher « 14 inscrits — 2 joueurs seront exemptés à chaque tour ». |
| **Calendrier** | Formats dynamiques : on ne planifie que le tour suivant. L'écran calendrier doit afficher « tour 4 sur 7 » plutôt qu'une grille de la journée. |
| **Rappels** | Sans objet pour une animation : tout le monde est présent du début à la fin. Masquer l'onglet. |
| **Tableau final** | Sans objet sauf pour TMC et poules+tableau. Le classement final **est** le classement cumulé. |
| **Page publique** | Nouvelle vue : classement individuel en direct, et « qui joue où au tour en cours ». C'est l'écran que les joueurs regarderont le plus. |
| **PDF** | Grille de rotation imprimable (qui joue avec et contre qui, à chaque tour, sur quel terrain) — c'est la feuille la plus fastidieuse à faire à la main, donc la plus utile. |
| **Scoreur** | Son écran devient « saisie du tour en cours », pas « liste des matchs ». |

---

## 6. Feuille de route

| Lot | Contenu | Durée |
|---|---|---|
| **9** | Abstraction des formats + **Americano** complet | 3 j |
| **10** | **Mexicano** + **Mixicano** | 1 j |
| **11** | **Montée-descente** (deux variantes) | 1,5 j |
| **12** | **TMC** multi-chances | 2 j |

Le lot 9 porte tout le coût de l'abstraction. Les suivants sont peu coûteux précisément parce qu'il a été fait correctement. **Ne commence pas par le TMC** même s'il est le plus proche de l'existant : il ne force pas l'abstraction, et tu te retrouverais à tout refaire au lot suivant.

---

## 7. Prompts Claude Code

### Lot 9 — Abstraction + Americano

À découper en trois sessions : l'abstraction, puis le moteur Americano, puis les écrans. Ne les fusionne pas.

#### 9.1 — L'abstraction

> Lis `CLAUDE.md` et l'ensemble de `lib/engine/`.
>
> Introduis une abstraction de **format d'animation** sans modifier le comportement actuel.
>
> Crée `lib/engine/formats/types.ts` avec l'interface `FormatAnimation` décrite dans `docs/formats-animation.md` §4.1, puis `lib/engine/formats/poulesTableau.ts` qui **enveloppe le moteur existant sans en réécrire la logique** : la répartition en poules, le tirage, les tours, la planification, le classement, la qualification et le tableau restent les fonctions actuelles, simplement exposées derrière l'interface.
>
> Crée le registre `lib/engine/formats/index.ts` exposant `getFormat(code)` et `listerFormats()`.
>
> Migration : ajoute `tournaments.format_animation` (défaut `'poules_tableau'`), `tournaments.config_animation` (jsonb), `teams.ephemere` et `teams.tour_origine`, et la table `standings_joueurs`. Aucune donnée existante ne doit changer de comportement.
>
> Remplace dans les routes et les écrans tout appel direct au moteur par un passage par le registre. Aucun composant ne doit connaître un format en particulier.
>
> **Critère de réussite : `npm test` passe sans qu'aucun test existant n'ait été modifié.** Si un test doit changer, c'est que l'abstraction est mauvaise — arrête-toi et explique pourquoi plutôt que d'adapter le test.

#### 9.2 — Le moteur Americano

> Lis `CLAUDE.md`, `lib/engine/formats/types.ts` et `docs/formats-animation.md` §4.3 à §4.5.
>
> Implémente `lib/engine/formats/americano.ts` : unité de classement **joueur**, calendrier **statique**, partenaire **tournant**, score en **points**, pas de tableau final.
>
> **Rotation.** Écris `genererRotation(joueurs, tours, terrains, seed)` : appariement glouton minimisant d'abord les partenariats répétés (poids fort), puis les adversaires répétés (poids faible), avec répartition équitable des exemptions quand l'effectif n'est pas un multiple de 4. Graine mémorisée pour reproductibilité. Ajoute un garde-fou au-delà de 40 joueurs (avertissement, pas blocage).
>
> Chaque manche crée deux **équipes éphémères** (`teams.ephemere = true`, `tour_origine` renseigné) et un `match` normal : la saisie de score, l'audit et le temps réel existants doivent fonctionner sans modification.
>
> **Score en points.** Étends `MatchFormat` avec `modeScore`, `points_cible` et `somme_exacte`. En mode points avec somme exacte, la saisie d'un camp déduit l'autre. Le vainqueur est le camp au score le plus élevé ; l'égalité est refusée si `somme_exacte` et `points_cible` est pair — propose alors un point en or.
>
> **Classement individuel.** `classement()` renvoie des lignes par joueur : manches jouées, victoires, points marqués, points encaissés, différence, tours d'exemption. Ordre de départage configurable, par défaut : points marqués, différence, victoires, confrontation directe, moins d'exemptions. Expose un mode alternatif **« points par manche »** pour les effectifs non multiples de 4.
>
> **Tests obligatoires.** 8 joueurs sur 7 tours : chacun doit jouer exactement une fois avec chacun des sept autres, aucune exemption, 28 partenariats distincts. 12 et 16 joueurs : zéro partenariat répété. 10 joueurs sur 8 tours : exemptions réparties à ±1 près. Un classement complet rejoué de bout en bout et vérifié à la main.
>
> Termine par `npm test`.

#### 9.3 — Les écrans

> Lis `CLAUDE.md` et `lib/engine/formats/americano.ts`.
>
> **Création de tournoi.** Ajoute en première étape le choix du **format d'animation** (liste issue du registre, avec nom et description). Le reste du formulaire s'adapte : un Americano demande un nombre de manches, des points par manche et des terrains, pas un nombre de qualifiés. Affiche une estimation de durée et un avertissement si l'effectif n'est pas un multiple de 4.
>
> **Inscriptions.** En Americano, masque l'inscription en paire : l'unité est le joueur. Le compteur de places affiche « N inscrits — M joueurs exemptés par tour » quand l'effectif n'est pas un multiple de 4.
>
> **Écran de déroulé — c'est l'écran central, à soigner.** Un seul écran, pensé pour un téléphone tenu d'une main au bord du terrain :
> - un en-tête « Tour 4 sur 7 » avec la progression ;
> - une carte par terrain : les deux paires, en gros ; un champ unique pour les points d'un camp, l'autre se déduisant automatiquement ; un bouton Valider ;
> - la liste des joueurs exemptés de ce tour ;
> - le classement individuel en direct dessous, replié par défaut ;
> - le passage au tour suivant débloqué quand toutes les manches du tour sont validées.
>
> **Objectif ergonomique : saisir un score ne doit pas demander plus de trois gestes.** Pas de navigation entre les écrans pendant une manche, pas de modale, pas de confirmation.
>
> **Page publique.** Nouvelle vue pour les formats à classement individuel : classement en direct, et « qui joue où au tour en cours ». Mise à jour temps réel comme l'existant.
>
> Masque les onglets sans objet pour ce format : tirage, calendrier de la journée, tableau final, rappels. Appuie-toi sur les propriétés de `FormatAnimation`, jamais sur un test du code du format.

### Lot 10 — Mexicano et Mixicano

> Lis `CLAUDE.md`, `lib/engine/formats/americano.ts` et `docs/formats-animation.md` §4.6.
>
> **Mexicano** (`formats/mexicano.ts`) : identique à l'Americano, sauf le calendrier qui devient **dynamique**. Tour 1 aléatoire, ou par niveau si les classements FFT sont renseignés. À chaque tour suivant, reclasse les joueurs, affecte les quatre premiers au terrain 1, les quatre suivants au terrain 2, etc., et apparie **1+4 contre 2+3** sur chaque terrain (variante 1+3 contre 2+4 configurable). Évite le même partenaire deux tours de suite quand c'est possible. Les joueurs exemptés sont ceux du bas de classement, en rotation équitable.
>
> `tourSuivant()` ne produit un tour que si toutes les manches du tour courant sont validées. L'écran de déroulé doit afficher « le tour suivant sera composé après validation de toutes les manches ».
>
> **Mixicano** (`formats/mixicano.ts`) : Americano statique avec contrainte de mixité — chaque paire compte un homme et une femme. Les inscriptions doivent compter les deux sexes séparément et bloquer l'inscription qui déséquilibre au-delà du tolérable. La rotation apparie hommes et femmes en deux rotations parallèles.
>
> Tests : Mexicano sur 16 joueurs et 6 tours — vérifier que l'écart de classement à l'intérieur d'un terrain décroît au fil des tours. Mixicano sur 8+8 — vérifier qu'aucune paire n'est non mixte.
>
> Termine par `npm test`.

### Lot 11 — Montée-descente

> Lis `CLAUDE.md` et `docs/formats-animation.md` §4.7.
>
> Implémente `formats/monteeDescente.ts` : calendrier **dynamique**, deux variantes au choix dans la configuration du tournoi.
>
> **Variante paire fixe** : unité de classement équipe. Après chaque manche, la paire gagnante monte d'un terrain, la perdante descend. Les gagnants du terrain 1 y restent, les perdants du dernier terrain y restent.
>
> **Variante individuelle** : unité de classement joueur. Mêmes montées et descentes, mais les quatre joueurs d'un terrain recomposent leurs paires à chaque tour — par défaut les deux arrivants jouent ensemble.
>
> Manches courtes : durée en minutes **ou** total de points, au choix. Classement configurable : points cumulés, ou nombre de tours passés sur le terrain du haut.
>
> L'écran de déroulé affiche les terrains **du haut vers le bas**, avec une flèche indiquant qui monte et qui descend dès la manche validée — c'est l'information que les joueurs réclament immédiatement.
>
> Tests : 12 joueurs sur 3 terrains, 8 tours — aucun joueur ne sort du système, les mouvements sont cohérents, les positions extrêmes sont correctement gérées.
>
> Termine par `npm test`.

### Lot 12 — TMC multi-chances

> Lis `CLAUDE.md` et le module de tableau final existant.
>
> Implémente `formats/tmc.ts` : binôme **fixe**, score en jeux/sets, calendrier **dynamique**. Une défaite ne sort pas du tournoi : l'équipe bascule vers un tableau de consolante.
>
> Configuration : nombre de tableaux (principal + 1 ou 2 consolantes), nombre de paires, format de match par tour. Chaque tableau a son propre vainqueur.
>
> Réutilise au maximum la génération et la propagation du tableau final existantes : un TMC est un arbre principal plus un ou deux arbres de repêchage alimentés par les perdants. Le classement final liste les vainqueurs de chaque tableau, dans l'ordre des tableaux.
>
> C'est le seul format de la série qui peut être homologué FFT : prévois un champ « homologué » et le rappel que licence et juge-arbitre sont alors requis. L'application ne gère pas la remontée des résultats à la FFT.
>
> Tests : 16 paires, principal + une consolante — chaque paire joue au moins deux matchs, aucune paire ne disparaît de l'arbre.
>
> Termine par `npm test`.

---

## 8. Mise à jour du `CLAUDE.md`

```markdown
## Formats d'animation
- Chaque format vit dans `lib/engine/formats/<code>.ts` et implémente `FormatAnimation`.
  Aucun composant, aucune route ne teste le code d'un format : tout passe par le registre
  et par les propriétés déclarées (uniteClassement, calendrier, partenaire, modeScore,
  aUnTableauFinal).
- Les paires éphémères des formats à partenaire tournant sont des `teams` avec
  `ephemere = true`. La table `matches` et la saisie de score ne changent jamais
  selon le format.
- Un format dynamique ne génère que le tour suivant, et seulement quand toutes les
  manches du tour courant sont validées.
- Écran de déroulé : saisir un score ne doit jamais demander plus de trois gestes.
```

---

## 9. Ce que je ferais à ta place

Le lot 9 seul, testé sur une vraie soirée de club avec 12 ou 16 joueurs, avant d'écrire une ligne des lots 10 à 12. Un Americano qui tourne bien te donnera plus d'enseignements sur ce qu'il faut à l'écran de déroulé que n'importe quelle spécification — et ces enseignements changeront la façon dont tu écriras les trois formats suivants.

---

## Sources

- [Smatchup — Le tournoi Americano de padel](https://smatchup.fr/tournoi-padel/americano)
- [Smatchup — Le TMC et la montée-descente au padel](https://smatchup.fr/tournoi-padel/tmc)
- [Smatchup — Tournoi de padel, le guide complet](https://smatchup.fr/guide/tournoi-de-padel)
- [FFT — Compétitions padel](https://www.fft.fr/nos-sports/padel/competitions-padel)