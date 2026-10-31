-- Abstraction des formats d'animation (docs/formats-animation.md §4.2).
-- Aucune donnée existante ne change de comportement : tout tournoi garde le
-- format actuel (poules + tableau), aucune équipe n'est éphémère.

-- Format d'animation du tournoi et sa configuration propre.
alter table tournaments
  add column format_animation text not null default 'poules_tableau',
  add column config_animation jsonb not null default '{}'::jsonb;

-- Équipes éphémères : créées par tour pour les formats à partenaire tournant,
-- invisibles des inscriptions. `tour_origine` = tour qui les a créées.
alter table teams
  add column ephemere boolean not null default false,
  add column tour_origine integer;

-- Classement individuel (formats dont l'unité de classement est le joueur),
-- à côté de `standings` (équipes), pas à la place.
create table standings_joueurs (
  tournament_id    uuid not null references tournaments(id) on delete cascade,
  player_id        uuid not null references players(id) on delete cascade,
  manches_jouees   integer not null default 0,
  victoires        integer not null default 0,
  points_marques   integer not null default 0,
  points_encaisses integer not null default 0,
  difference       integer not null default 0,
  tours_exempt     integer not null default 0,
  rang             integer,
  primary key (tournament_id, player_id)
);

alter table standings_joueurs enable row level security;

create policy "admin_all_standings_joueurs" on standings_joueurs
  for all to authenticated
  using (exists (select 1 from memberships where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from memberships where user_id = auth.uid() and role = 'admin'));

-- Lecture publique comme `standings` : tournois publiés, en cours ou terminés.
create policy "public_read_standings_joueurs_of_published" on standings_joueurs
  for select to anon, authenticated
  using (
    exists (
      select 1 from tournaments t
      where t.id = standings_joueurs.tournament_id and t.statut in ('publie', 'en_cours', 'termine')
    )
  );

-- Comme `standings` : le scoreur d'un tournoi tient à jour son classement.
create policy "scorekeeper_manage_standings_joueurs" on standings_joueurs
  for all to authenticated
  using (
    exists (
      select 1 from memberships m
      where m.user_id = auth.uid() and m.role = 'scorekeeper' and m.tournament_id = standings_joueurs.tournament_id
    )
  )
  with check (
    exists (
      select 1 from memberships m
      where m.user_id = auth.uid() and m.role = 'scorekeeper' and m.tournament_id = standings_joueurs.tournament_id
    )
  );
