---
paths:
  - "src/app/admin/**"
  - "src/app/auth/**"
  - "src/app/compte/**"
  - "src/lib/supabase/**"
  - "src/lib/participant/**"
  - "src/lib/staff/**"
  - "supabase/migrations/**"
---

# Auth et rôles — détail

Trois familles de comptes, toutes dans le même `auth.users` Supabase, distinguées par
des tables séparées :

- **Staff** (`memberships(user_id, role, tournament_id)`) — `role='admin'` est global
  (`tournament_id` null, accès à tous les clubs) ; `role='scorekeeper'` est scopé à
  UN tournoi (`tournament_id` non null), avec le droit de saisir ET valider les
  scores de ce tournoi uniquement (rien sur les clubs, inscriptions, tirage,
  calendrier). Voir `src/lib/staff/session.ts` (`getRolesStaff`, `estAdmin`,
  `estScoreurDuTournoi`) et `src/proxy.ts`.
- **Participant** (`players.user_id`, nullable) — profil joueur en self-service.
  Voir `src/lib/participant/session.ts` (`getParticipantConnecte`).

**Ajouter un rôle staff futur** : une nouvelle valeur dans le `check` de
`memberships.role` (+ éventuellement une colonne de portée si le scope diffère de
tournoi/global), puis les policies RLS scopées correspondantes — jamais une
nouvelle table par rôle (`admins`, `scorekeepers`, ... ne pas réintroduire ce
pattern, abandonné volontairement en faveur de `memberships`).

Connexion staff par e-mail + mot de passe (`supabase.auth.signInWithPassword`,
`src/app/admin/login/actions.ts`) : après connexion réussie, on vérifie les rôles
via `getRolesStaff()` — pas de compte staff → déconnexion immédiate. Aucun gate par
e-mail en dur (`ADMIN_EMAIL` a été supprimé : il ne supportait qu'un seul admin,
incohérent avec `memberships` qui en supporte plusieurs).

Les comptes staff se créent **uniquement** via une action serveur avec
`auth.admin.createUser` (`src/lib/supabase/service.ts`, jamais côté client) —
mot de passe initial transmis à la main par l'admin qui invite, jamais par e-mail.
Voir `src/app/admin/tournois/[id]/arbitresActions.ts` pour le flux d'invitation
d'un scoreur.

Le lien magique (e-mail) ne sert **jamais** à se connecter au quotidien : il ne sert
qu'à réinitialiser un mot de passe oublié (`supabase.auth.resetPasswordForEmail`),
via `/auth/callback` qui redirige toujours vers `/admin/definir-mot-de-passe`,
jamais directement vers `/admin`.

**Ne réintroduis pas `signInWithOtp` comme méthode de connexion.**

Ça ne suffit pas seul : « Allow new users to sign up » doit rester désactivé dans
Supabase Auth > Providers > Email, sinon la clé anon publique permet à n'importe qui
de créer un compte `authenticated`. C'est la table `memberships`/`players` (RLS) qui
fait foi pour les droits, jamais la seule existence d'une session.

## Migrations et RLS
- Toute nouvelle table exposée au public a une policy RLS explicite dans la même migration.
- Un nouveau rôle scopé (type scorekeeper) a besoin d'une policy de LECTURE par table
  de contexte nécessaire à son écran (voir `20260903100000_memberships_et_role_scoreur.sql`
  pour l'exemple complet : tournaments/groups/group_teams/teams en lecture,
  matches/match_sets/standings/audit_log en écriture, rien d'autre).
- Après `supabase db push`, régénérer `src/lib/supabase/database.types.ts`
  (`supabase gen types typescript --project-id <ref>`).
- Ne jamais utiliser la clé service_role côté client : `src/lib/supabase/service.ts`
  est réservé au serveur.
