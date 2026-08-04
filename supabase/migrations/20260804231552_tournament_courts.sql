-- Les terrains appartiennent au club (réutilisables entre tournois), mais
-- chaque tournoi doit pouvoir choisir lesquels sont effectivement
-- disponibles pour lui (un club peut avoir plus de terrains que ce qui
-- est réservé un jour donné).

create table tournament_courts (
  tournament_id uuid not null references tournaments(id) on delete cascade,
  court_id uuid not null references courts(id) on delete cascade,
  primary key (tournament_id, court_id)
);

alter table tournament_courts enable row level security;

create policy "public_read_tournament_courts_of_published" on tournament_courts
  for select to anon using (
    exists (
      select 1 from tournaments t
      where t.id = tournament_courts.tournament_id and t.statut = 'publie'
    )
  );

create policy "admin_all_tournament_courts" on tournament_courts
  for all to authenticated using (true) with check (true);
