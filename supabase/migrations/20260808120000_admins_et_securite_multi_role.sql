-- Prérequis de sécurité avant l'ouverture de comptes participants (V2, §
-- espace joueur) : jusqu'ici, TOUTE ligne "authenticated" avait un accès
-- admin total (`using (true)`) — un choix volontaire documenté dans
-- 20260803120100_rls_policies.sql tant que seul un compte admin existait
-- et que les inscriptions publiques étaient désactivées côté Supabase Auth.
--
-- On ouvre maintenant des comptes "participant" (auth.users) qui ne
-- doivent PAS avoir de droits admin. On introduit donc une table
-- `admins` explicite et on regénère toutes les policies "admin_all_*"
-- pour qu'elles vérifient l'appartenance à cette table plutôt qu'un
-- simple `authenticated`.

create table admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table admins enable row level security;

-- Un utilisateur ne peut lire que sa propre ligne (sert au proxy/middleware
-- et aux pages pour savoir "suis-je admin ?"). Aucune écriture via l'API :
-- la table est gérée uniquement en migration / service_role.
create policy "self_read_admins" on admins
  for select to authenticated using (user_id = auth.uid());

-- Compte admin existant (club 2BSport, celpsy4@hotmail.fr).
insert into admins (user_id) values ('6aed8a93-2b8c-4b06-89ae-2b54b9d1e68e');

-- ── Regénération des policies admin_all_* : `authenticated` → `admins` ──

drop policy "admin_all_clubs" on clubs;
create policy "admin_all_clubs" on clubs
  for all to authenticated
  using (exists (select 1 from admins where user_id = auth.uid()))
  with check (exists (select 1 from admins where user_id = auth.uid()));

drop policy "admin_all_courts" on courts;
create policy "admin_all_courts" on courts
  for all to authenticated
  using (exists (select 1 from admins where user_id = auth.uid()))
  with check (exists (select 1 from admins where user_id = auth.uid()));

drop policy "admin_all_tournaments" on tournaments;
create policy "admin_all_tournaments" on tournaments
  for all to authenticated
  using (exists (select 1 from admins where user_id = auth.uid()))
  with check (exists (select 1 from admins where user_id = auth.uid()));

drop policy "admin_all_players" on players;
create policy "admin_all_players" on players
  for all to authenticated
  using (exists (select 1 from admins where user_id = auth.uid()))
  with check (exists (select 1 from admins where user_id = auth.uid()));

drop policy "admin_all_teams" on teams;
create policy "admin_all_teams" on teams
  for all to authenticated
  using (exists (select 1 from admins where user_id = auth.uid()))
  with check (exists (select 1 from admins where user_id = auth.uid()));

drop policy "admin_all_team_players" on team_players;
create policy "admin_all_team_players" on team_players
  for all to authenticated
  using (exists (select 1 from admins where user_id = auth.uid()))
  with check (exists (select 1 from admins where user_id = auth.uid()));

drop policy "admin_all_registrations" on registrations;
create policy "admin_all_registrations" on registrations
  for all to authenticated
  using (exists (select 1 from admins where user_id = auth.uid()))
  with check (exists (select 1 from admins where user_id = auth.uid()));

drop policy "admin_all_groups" on groups;
create policy "admin_all_groups" on groups
  for all to authenticated
  using (exists (select 1 from admins where user_id = auth.uid()))
  with check (exists (select 1 from admins where user_id = auth.uid()));

drop policy "admin_all_group_teams" on group_teams;
create policy "admin_all_group_teams" on group_teams
  for all to authenticated
  using (exists (select 1 from admins where user_id = auth.uid()))
  with check (exists (select 1 from admins where user_id = auth.uid()));

drop policy "admin_all_matches" on matches;
create policy "admin_all_matches" on matches
  for all to authenticated
  using (exists (select 1 from admins where user_id = auth.uid()))
  with check (exists (select 1 from admins where user_id = auth.uid()));

drop policy "admin_all_match_sets" on match_sets;
create policy "admin_all_match_sets" on match_sets
  for all to authenticated
  using (exists (select 1 from admins where user_id = auth.uid()))
  with check (exists (select 1 from admins where user_id = auth.uid()));

drop policy "admin_all_standings" on standings;
create policy "admin_all_standings" on standings
  for all to authenticated
  using (exists (select 1 from admins where user_id = auth.uid()))
  with check (exists (select 1 from admins where user_id = auth.uid()));

drop policy "admin_all_audit_log" on audit_log;
create policy "admin_all_audit_log" on audit_log
  for all to authenticated
  using (exists (select 1 from admins where user_id = auth.uid()))
  with check (exists (select 1 from admins where user_id = auth.uid()));

-- ── Statut de validation d'une équipe (§ auto-inscription participant) ──
-- Une équipe créée par l'admin (paire ou tirage aléatoire) est valide
-- d'emblée (valeur par défaut) ; une équipe créée par auto-inscription
-- d'un participant démarre "en_attente" et est exclue du tirage tant que
-- l'admin ne l'a pas validée.

alter table teams add column statut text not null default 'validee'
  check (statut in ('en_attente', 'validee'));
