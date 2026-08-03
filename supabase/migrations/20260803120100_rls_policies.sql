-- RLS : lecture publique limitée aux tournois publiés, écriture réservée
-- au rôle admin. V1 n'a qu'un seul compte admin : les inscriptions par
-- e-mail (magic link) doivent être désactivées côté Supabase Auth
-- (Authentication > Providers > Email > "Allow new users to sign up" = off)
-- et le compte admin créé manuellement, sinon n'importe qui pourrait créer
-- un compte "authenticated" avec la clé anon publique et contourner ces
-- policies. Voir README du projet.

alter table clubs enable row level security;
alter table courts enable row level security;
alter table tournaments enable row level security;
alter table players enable row level security;
alter table teams enable row level security;
alter table team_players enable row level security;
alter table registrations enable row level security;
alter table groups enable row level security;
alter table group_teams enable row level security;
alter table matches enable row level security;
alter table match_sets enable row level security;
alter table standings enable row level security;
alter table audit_log enable row level security;

-- clubs & courts : information publique non sensible (nom de club/terrain).
create policy "public_read_clubs" on clubs
  for select to anon, authenticated using (true);
create policy "admin_all_clubs" on clubs
  for all to authenticated using (true) with check (true);

create policy "public_read_courts" on courts
  for select to anon, authenticated using (true);
create policy "admin_all_courts" on courts
  for all to authenticated using (true) with check (true);

-- tournaments : lecture publique uniquement si statut = 'publie'.
create policy "public_read_published_tournaments" on tournaments
  for select to anon using (statut = 'publie');
create policy "admin_all_tournaments" on tournaments
  for all to authenticated using (true) with check (true);

-- players : contient téléphone/e-mail, jamais public. Le nom affiché
-- public passe par teams.nom_affiche, pas par cette table.
create policy "admin_all_players" on players
  for all to authenticated using (true) with check (true);

-- teams : lecture publique si le tournoi parent est publié.
create policy "public_read_teams_of_published" on teams
  for select to anon using (
    exists (
      select 1 from tournaments t
      where t.id = teams.tournament_id and t.statut = 'publie'
    )
  );
create policy "admin_all_teams" on teams
  for all to authenticated using (true) with check (true);

-- team_players : composition des équipes, réservée à l'admin.
create policy "admin_all_team_players" on team_players
  for all to authenticated using (true) with check (true);

-- registrations : gestion interne, réservée à l'admin.
create policy "admin_all_registrations" on registrations
  for all to authenticated using (true) with check (true);

-- groups : lecture publique si le tournoi parent est publié.
create policy "public_read_groups_of_published" on groups
  for select to anon using (
    exists (
      select 1 from tournaments t
      where t.id = groups.tournament_id and t.statut = 'publie'
    )
  );
create policy "admin_all_groups" on groups
  for all to authenticated using (true) with check (true);

-- group_teams : composition des poules, publique si tournoi publié.
create policy "public_read_group_teams_of_published" on group_teams
  for select to anon using (
    exists (
      select 1 from groups g
      join tournaments t on t.id = g.tournament_id
      where g.id = group_teams.group_id and t.statut = 'publie'
    )
  );
create policy "admin_all_group_teams" on group_teams
  for all to authenticated using (true) with check (true);

-- matches : calendrier et résultats, publics si tournoi publié.
create policy "public_read_matches_of_published" on matches
  for select to anon using (
    exists (
      select 1 from tournaments t
      where t.id = matches.tournament_id and t.statut = 'publie'
    )
  );
create policy "admin_all_matches" on matches
  for all to authenticated using (true) with check (true);

-- match_sets : détail des sets, public si tournoi publié.
create policy "public_read_match_sets_of_published" on match_sets
  for select to anon using (
    exists (
      select 1 from matches m
      join tournaments t on t.id = m.tournament_id
      where m.id = match_sets.match_id and t.statut = 'publie'
    )
  );
create policy "admin_all_match_sets" on match_sets
  for all to authenticated using (true) with check (true);

-- standings : classements, publics si tournoi publié.
create policy "public_read_standings_of_published" on standings
  for select to anon using (
    exists (
      select 1 from tournaments t
      where t.id = standings.tournament_id and t.statut = 'publie'
    )
  );
create policy "admin_all_standings" on standings
  for all to authenticated using (true) with check (true);

-- audit_log : jamais public.
create policy "admin_all_audit_log" on audit_log
  for all to authenticated using (true) with check (true);
