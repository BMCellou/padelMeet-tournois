@AGENTS.md

# Projet : gestion de tournois de padel

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
- Aucun `any`. Types dérivés du schéma Supabase via `supabase gen types typescript --linked`,
  générés dans `src/lib/supabase/database.types.ts`. Régénère ce fichier après toute
  migration SQL (`supabase db push` puis `supabase gen types typescript --linked > ...`).
- Toute fonction du moteur a un test Vitest AVANT d'être branchée à l'interface.
- Les scores ne sont jamais stockés en chaîne de caractères : table `match_sets`.
- Aucune règle de départage codée en dur : elles viennent de `tournaments.tiebreak_rules`.

## Règles métier non négociables
- Minimum 4 équipes par poule (garantit 3 matchs par équipe).
- Format de match par défaut : 1 set en 7 jeux, point décisif, tie-break en 7 points à 6-6.
  Tout est paramétrable par tournoi ET par phase. Aucune valeur en dur dans les composants.
- Pas de petite finale : deux 3<sup>es</sup> ex æquo.
- Le cumul de jeux gagnés sur tout le tournoi est tenu à jour dès le premier match validé.

## Scénarios de référence
- `tests/fixtures/tournoi-25-juillet.ts` : 14 équipes, poules 5/5/4, tableau de 8,
  2 premiers de chaque poule + 2 meilleurs 3<sup>es</sup>.
- `tests/fixtures/poule-unique-5.ts` : 5 équipes, poule unique, 2 terrains,
  5 tours avec un exempt par tour, classement final = classement de poule.
Toute modification du moteur doit garder ces deux tests au vert.

## Sécurité auth admin (V1)
Un seul compte admin, authentifié par magic link Supabase, restreint côté
serveur à `process.env.ADMIN_EMAIL` (`src/app/admin/login/actions.ts`).
Ça ne suffit pas seul : désactive aussi "Allow new users to sign up" dans
Supabase Auth > Providers > Email, sinon la clé anon publique permet à
n'importe qui d'appeler `signInWithOtp` avec une autre adresse et de créer
un compte `authenticated` qui passerait les policies RLS admin. Crée le
compte admin manuellement une fois le projet Supabase lié.

## Ce qu'il ne faut PAS faire
- Ne pas ajouter de comptes joueurs, de paiement ou de notifications (hors périmètre V1).
- Ne pas optimiser l'algorithme de planification : glouton + ajustement manuel suffit.
- Ne pas créer de fichier de documentation non demandé.
