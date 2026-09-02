-- Généralise la table `admins` (rôle unique, global, non scopé) en une
-- vraie table de rôles (`memberships`), pour pouvoir ajouter des rôles
-- futurs sans dupliquer une policy RLS par table à chaque fois. Introduit
-- le premier rôle scopé : `scorekeeper`, rattaché à UN tournoi précis,
-- avec le droit de saisir ET valider les scores de ce tournoi (mais rien
-- d'autre : ni les clubs, ni les inscriptions, ni le tirage).
--
-- `role='admin'` reste global (tournament_id null), comme aujourd'hui.
-- `role='scorekeeper'` exige un tournament_id.

create table memberships (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  role          text not null check (role in ('admin', 'scorekeeper')),
  tournament_id uuid references tournaments(id) on delete cascade,
  created_at    timestamptz not null default now(),
  constraint memberships_scope_coherente check (
    (role = 'admin' and tournament_id is null) or
    (role = 'scorekeeper' and tournament_id is not null)
  )
);

create unique index memberships_admin_unique
  on memberships (user_id) where role = 'admin';
create unique index memberships_scorekeeper_unique
  on memberships (user_id, tournament_id) where role = 'scorekeeper';

alter table memberships enable row level security;

-- Un utilisateur ne peut lire que ses propres rôles (sert au proxy et aux
-- pages pour savoir "quel est mon rôle ?"). Écriture réservée au
-- service_role (action serveur d'invitation), jamais via l'API cliente.
create policy "self_read_memberships" on memberships
  for select to authenticated using (user_id = auth.uid());

-- Migration des admins existants.
insert into memberships (user_id, role)
  select user_id, 'admin' from admins;

-- ── admin_all_* : `admins` → `memberships (role='admin')` ──

drop policy "admin_all_clubs" on clubs;
create policy "admin_all_clubs" on clubs
  for all to authenticated
  using (exists (select 1 from memberships where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from memberships where user_id = auth.uid() and role = 'admin'));

drop policy "admin_all_courts" on courts;
create policy "admin_all_courts" on courts
  for all to authenticated
  using (exists (select 1 from memberships where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from memberships where user_id = auth.uid() and role = 'admin'));

drop policy "admin_all_tournaments" on tournaments;
create policy "admin_all_tournaments" on tournaments
  for all to authenticated
  using (exists (select 1 from memberships where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from memberships where user_id = auth.uid() and role = 'admin'));

drop policy "admin_all_players" on players;
create policy "admin_all_players" on players
  for all to authenticated
  using (exists (select 1 from memberships where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from memberships where user_id = auth.uid() and role = 'admin'));

drop policy "admin_all_teams" on teams;
create policy "admin_all_teams" on teams
  for all to authenticated
  using (exists (select 1 from memberships where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from memberships where user_id = auth.uid() and role = 'admin'));

drop policy "admin_all_team_players" on team_players;
create policy "admin_all_team_players" on team_players
  for all to authenticated
  using (exists (select 1 from memberships where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from memberships where user_id = auth.uid() and role = 'admin'));

drop policy "admin_all_registrations" on registrations;
create policy "admin_all_registrations" on registrations
  for all to authenticated
  using (exists (select 1 from memberships where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from memberships where user_id = auth.uid() and role = 'admin'));

drop policy "admin_all_groups" on groups;
create policy "admin_all_groups" on groups
  for all to authenticated
  using (exists (select 1 from memberships where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from memberships where user_id = auth.uid() and role = 'admin'));

drop policy "admin_all_group_teams" on group_teams;
create policy "admin_all_group_teams" on group_teams
  for all to authenticated
  using (exists (select 1 from memberships where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from memberships where user_id = auth.uid() and role = 'admin'));

drop policy "admin_all_matches" on matches;
create policy "admin_all_matches" on matches
  for all to authenticated
  using (exists (select 1 from memberships where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from memberships where user_id = auth.uid() and role = 'admin'));

drop policy "admin_all_match_sets" on match_sets;
create policy "admin_all_match_sets" on match_sets
  for all to authenticated
  using (exists (select 1 from memberships where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from memberships where user_id = auth.uid() and role = 'admin'));

drop policy "admin_all_standings" on standings;
create policy "admin_all_standings" on standings
  for all to authenticated
  using (exists (select 1 from memberships where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from memberships where user_id = auth.uid() and role = 'admin'));

drop policy "admin_all_audit_log" on audit_log;
create policy "admin_all_audit_log" on audit_log
  for all to authenticated
  using (exists (select 1 from memberships where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from memberships where user_id = auth.uid() and role = 'admin'));

drop policy "self_read_admins" on admins;
drop table admins;

-- ── Rôle scorekeeper : lecture du contexte de son tournoi, écriture des
-- scores uniquement (matches/match_sets/standings), rien d'autre. ──

create policy "scorekeeper_read_tournaments" on tournaments
  for select to authenticated using (
    exists (
      select 1 from memberships m
      where m.user_id = auth.uid() and m.role = 'scorekeeper' and m.tournament_id = tournaments.id
    )
  );

create policy "scorekeeper_read_groups" on groups
  for select to authenticated using (
    exists (
      select 1 from memberships m
      where m.user_id = auth.uid() and m.role = 'scorekeeper' and m.tournament_id = groups.tournament_id
    )
  );

create policy "scorekeeper_read_group_teams" on group_teams
  for select to authenticated using (
    exists (
      select 1 from groups g
      join memberships m on m.tournament_id = g.tournament_id
      where g.id = group_teams.group_id and m.user_id = auth.uid() and m.role = 'scorekeeper'
    )
  );

create policy "scorekeeper_read_teams" on teams
  for select to authenticated using (
    exists (
      select 1 from memberships m
      where m.user_id = auth.uid() and m.role = 'scorekeeper' and m.tournament_id = teams.tournament_id
    )
  );

create policy "scorekeeper_read_matches" on matches
  for select to authenticated using (
    exists (
      select 1 from memberships m
      where m.user_id = auth.uid() and m.role = 'scorekeeper' and m.tournament_id = matches.tournament_id
    )
  );

create policy "scorekeeper_update_matches" on matches
  for update to authenticated using (
    exists (
      select 1 from memberships m
      where m.user_id = auth.uid() and m.role = 'scorekeeper' and m.tournament_id = matches.tournament_id
    )
  ) with check (
    exists (
      select 1 from memberships m
      where m.user_id = auth.uid() and m.role = 'scorekeeper' and m.tournament_id = matches.tournament_id
    )
  );

create policy "scorekeeper_manage_match_sets" on match_sets
  for all to authenticated using (
    exists (
      select 1 from matches ma
      join memberships m on m.tournament_id = ma.tournament_id
      where ma.id = match_sets.match_id and m.user_id = auth.uid() and m.role = 'scorekeeper'
    )
  ) with check (
    exists (
      select 1 from matches ma
      join memberships m on m.tournament_id = ma.tournament_id
      where ma.id = match_sets.match_id and m.user_id = auth.uid() and m.role = 'scorekeeper'
    )
  );

create policy "scorekeeper_manage_standings" on standings
  for all to authenticated using (
    exists (
      select 1 from memberships m
      where m.user_id = auth.uid() and m.role = 'scorekeeper' and m.tournament_id = standings.tournament_id
    )
  ) with check (
    exists (
      select 1 from memberships m
      where m.user_id = auth.uid() and m.role = 'scorekeeper' and m.tournament_id = standings.tournament_id
    )
  );

create policy "scorekeeper_insert_audit_log" on audit_log
  for insert to authenticated with check (
    exists (
      select 1 from memberships m
      where m.user_id = auth.uid() and m.role = 'scorekeeper' and m.tournament_id = audit_log.tournament_id
    )
  );
