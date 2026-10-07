@AGENTS.md

# Projet : gestion de tournois de padel

## Commandes
- `npm run dev` — serveur de développement
- `npm test` — suite Vitest (à lancer après toute modification du moteur)
- `npm run lint` — ESLint
- `npx tsc --noEmit` — vérification de types
- Après toute migration SQL : `supabase db push` puis
  `supabase gen types typescript --linked > src/lib/supabase/database.types.ts`

## Workflow attendu
- Modification du moteur (`src/lib/engine/`) : le test Vitest est écrit AVANT le branchement
  à l'interface, puis `npm test` doit passer.
- Fin d'une série de modifications : `npm run lint` et `npx tsc --noEmit` doivent passer
  avant de proposer un commit.
- N'annonce jamais qu'une tâche est terminée sans montrer la sortie de la commande de
  vérification correspondante.
- Messages de commit : une phrase descriptive en français, sans préfixe de type (voir `git log`).

## Stack
Next.js (App Router) + TypeScript strict + Tailwind + shadcn/ui + Supabase
(Postgres + Auth + Realtime) + Vitest, déploiement Vercel.
Ce projet a été scaffoldé avec `create-next-app@latest`, qui a installé
Next.js 16 : le fichier `middleware.ts` est déprécié et remplacé par
`src/proxy.ts` (export `proxy`, pas `middleware`). Vérifie
`node_modules/next/dist/docs/` avant d'utiliser une API Next dont tu n'es
pas sûr côté conventions récentes.

## Architecture — règle absolue
Toute la logique de tournoi vit dans `src/lib/engine/`, en fonctions pures :
pas d'accès base, pas d'appel réseau, pas de date système (l'horloge est un paramètre).
Entrée : un objet d'état. Sortie : un nouvel objet d'état. Jamais de mutation en place.
Les composants et les routes ne font qu'appeler le moteur et persister le résultat.

## Conventions
- Le domaine métier est en français (poule, tirage, classement, tableau), le code technique en anglais.
- Aucun `any`. Les types viennent du schéma Supabase, générés dans
  `src/lib/supabase/database.types.ts` (voir Commandes) — jamais écrits à la main.
- Les scores ne sont jamais stockés en chaîne de caractères : table `match_sets`.
- Aucune règle de départage codée en dur : elles viennent de `tournaments.tiebreak_rules`.

## Règles métier non négociables
- Minimum 4 équipes par poule en répartition automatique (garantit 3 matchs par équipe) ;
  quand l'admin force le nombre de poules, une poule de 3 est acceptée.
- Format de match par défaut : 1 set en 7 jeux, point décisif, tie-break en 7 points à 6-6.
  Tout est paramétrable par tournoi ET par phase. Aucune valeur en dur dans les composants.
- Petite finale (`matches.phase='classement'`) entre les deux perdants de demi-finale ; tant
  qu'elle n'est pas jouée, ils restent 3<sup>es</sup> ex æquo. Avec exactement 2 poules dont les
  3<sup>es</sup> ne sont pas qualifiés et au moins 3 terrains, un match de 5<sup>e</sup> place
  (`phase='classement_5e'`) oppose ces deux 3<sup>es</sup>.
- Le tableau final se génère automatiquement à la fin des poules ; l'admin peut ensuite changer
  les qualifiés (« Modifier les qualifiés ») tant que le tableau n'a pas commencé.
- Une limite de joueurs par tournoi (`tournaments.max_participants`, une paire = 2) bloque les
  inscriptions en ligne, jamais les ajouts de l'admin.
- Le cumul de jeux gagnés sur tout le tournoi est tenu à jour dès le premier match validé.

## Règles de cohérence
- Tous les ratios du moteur s'écrivent `gagnés / joués`, jamais `gagnés / perdus`.
  Dénominateur nul => valeur bornée, jamais Infinity ni NaN.
- Une correction de score qui modifierait la liste des qualifiés est refusée
  dès qu'un match du tableau a été validé.
- Aucune requête alimentant une page publique ne renvoie d'e-mail, de téléphone,
  de canal de rappel ou d'identifiant de compte. Sélection de colonnes explicite,
  jamais select('*').
- Les matchs du tableau final sont planifiés comme des emplacements : terrain et
  horaire existent avant que les équipes soient connues.
- Aucune combinaison de format ne doit produire un match impossible à valider.

## Scénarios de référence
- `tests/fixtures/tournoi-25-juillet.test.ts` : 14 équipes, poules 5/5/4, tableau de 8,
  2 premiers de chaque poule + 2 meilleurs 3<sup>es</sup>, petite finale comprise.
- `tests/fixtures/poule-unique-5.test.ts` : 5 équipes, poule unique, 2 terrains,
  5 tours avec un exempt par tour, classement final = classement de poule.
Toute modification du moteur doit garder ces deux tests au vert.

## Sécurité auth
- IMPORTANT : ne réintroduis jamais `signInWithOtp` comme méthode de connexion.
- Connexion par e-mail + mot de passe. Les rôles viennent de la table `memberships` : plusieurs
  admins possibles (jamais retirer le dernier actif), scoreurs rattachés à un ou plusieurs
  tournois. Un participant a une fiche `players` liée à son compte.
- Le lien magique ne sert qu'à activer le compte ou réinitialiser un mot de passe oublié
  (admin comme participant).
- Détail complet et pièges associés : `.claude/rules/auth-admin.md`.

## Ce qu'il ne faut PAS faire
- Ne pas ajouter de paiement des inscriptions.
- Notifications : uniquement les rappels de match (e-mail / WhatsApp, `src/lib/rappels/`) ; le cron
  est désactivé par défaut (`parametres_rappels.cron_actif`). Les tâches planifiées vivent dans
  `vercel.json` et exigent `CRON_SECRET` (rappels, sauvegarde quotidienne de la base).
- Ne pas optimiser l'algorithme de planification : glouton + ajustement manuel suffit.
- Ne pas créer de fichier de documentation non demandé.
- Spécifications fonctionnelles : `docs/specifications-fonctionnelles.md` — à mettre à jour
  quand un comportement visible par l'utilisateur change.
