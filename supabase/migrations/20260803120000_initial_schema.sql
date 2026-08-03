-- Schéma initial : gestion de tournois de padel (§3 des specs).
-- Le moteur de tournoi (lib/engine/) ne touche jamais cette base directement :
-- ces tables ne font que stocker le résultat de fonctions pures.

create extension if not exists pgcrypto;

-- ── clubs & terrains ─────────────────────────────────────────────────────

create table clubs (
  id   uuid primary key default gen_random_uuid(),
  nom  text not null,
  ville text
);

create table courts (
  id       uuid primary key default gen_random_uuid(),
  club_id  uuid not null references clubs(id) on delete cascade,
  nom      text not null,        -- "Terrain 1", "Terrain 2"
  ordre    integer not null default 0
);

-- ── tournois ─────────────────────────────────────────────────────────────

create table tournaments (
  id               uuid primary key default gen_random_uuid(),
  club_id          uuid not null references clubs(id) on delete restrict,
  nom              text not null,
  date             date not null,
  statut           text not null default 'brouillon'
                     check (statut in ('brouillon', 'publie', 'en_cours', 'termine')),
  genre            text check (genre in ('masculin', 'feminin', 'mixte')),
  niveau           text,
  public_slug      text unique,          -- identifiant aléatoire non devinable, jamais l'id
  format_config    jsonb not null default '{}'::jsonb,   -- MatchFormat par défaut du tournoi
  tiebreak_rules   jsonb not null default
    '["victoires", "confrontation_directe", "ratio_sets", "ratio_jeux"]'::jsonb,
  nb_qualifies     integer,
  duree_match_min  integer,
  pause_min        integer,
  created_at       timestamptz not null default now()
);

create index tournaments_club_id_idx on tournaments(club_id);

-- ── joueurs ──────────────────────────────────────────────────────────────

create table players (
  id              uuid primary key default gen_random_uuid(),
  nom             text not null,
  prenom          text not null,
  sexe            text check (sexe in ('H', 'F')),
  classement_fft  text,          -- ex. "15/1", "NC" : jamais un nombre pur
  telephone       text,
  email           text,
  user_id         uuid references auth.users(id) on delete set null  -- ⏩ futur compte joueur
);

-- ── équipes ──────────────────────────────────────────────────────────────

create table teams (
  id           uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  nom_affiche  text not null,
  seed         integer,
  origine      text not null check (origine in ('paire', 'aleatoire'))
);

create index teams_tournament_id_idx on teams(tournament_id);

create table team_players (
  team_id   uuid not null references teams(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  primary key (team_id, player_id)
);

-- Une équipe de padel ne peut jamais avoir plus de 2 joueurs : invariant
-- métier, pas seulement applicatif, donc vérifié en base.
create function check_team_players_max_two() returns trigger as $$
begin
  if (select count(*) from team_players where team_id = new.team_id) > 2 then
    raise exception 'Une équipe ne peut pas avoir plus de 2 joueurs (team_id=%)', new.team_id;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger team_players_max_two
  after insert on team_players
  for each row execute function check_team_players_max_two();

-- ── inscriptions ─────────────────────────────────────────────────────────

create table registrations (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  type          text not null check (type in ('paire', 'solo')),
  player_id     uuid references players(id) on delete cascade,
  team_id       uuid references teams(id) on delete cascade,
  statut        text not null default 'en_attente'
                  check (statut in ('en_attente', 'valide', 'annule')),
  constraint registrations_target_matches_type check (
    (type = 'solo'  and player_id is not null and team_id is null) or
    (type = 'paire' and team_id is not null and player_id is null)
  )
);

create index registrations_tournament_id_idx on registrations(tournament_id);

-- ── poules ───────────────────────────────────────────────────────────────

create table groups (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  nom           text not null,    -- 'A', 'B', 'C'...
  ordre         integer not null default 0
);

create index groups_tournament_id_idx on groups(tournament_id);

create table group_teams (
  group_id        uuid not null references groups(id) on delete cascade,
  team_id         uuid not null references teams(id) on delete cascade,
  position_tirage integer,
  primary key (group_id, team_id)
);

-- ── matchs ───────────────────────────────────────────────────────────────

create table matches (
  id               uuid primary key default gen_random_uuid(),
  tournament_id    uuid not null references tournaments(id) on delete cascade,
  phase            text not null check (phase in ('poule', 'tableau', 'classement')),
  group_id         uuid references groups(id) on delete set null,
  round            integer not null,
  bracket_slot     integer,
  team_a_id        uuid references teams(id) on delete set null,
  team_b_id        uuid references teams(id) on delete set null,
  court_id         uuid references courts(id) on delete set null,
  scheduled_at     timestamptz,
  duree_estimee    integer,
  statut           text not null default 'a_venir'
                     check (statut in
                       ('a_venir', 'pret', 'en_cours', 'saisi', 'valide', 'forfait')),
  winner_id        uuid references teams(id) on delete set null,
  next_match_id    uuid references matches(id) on delete set null,
  next_slot        text check (next_slot in ('a', 'b')),
  format_override  jsonb
);

create index matches_tournament_id_idx on matches(tournament_id);
create index matches_group_id_idx on matches(group_id);
create index matches_court_id_idx on matches(court_id);
create index matches_next_match_id_idx on matches(next_match_id);

create table match_sets (
  match_id   uuid not null references matches(id) on delete cascade,
  numero     integer not null,
  jeux_a     integer not null,
  jeux_b     integer not null,
  tiebreak_a integer,
  tiebreak_b integer,
  primary key (match_id, numero)
);

-- ── classements ──────────────────────────────────────────────────────────
-- Une ligne par (poule, équipe) pour le classement de poule, et une ligne
-- par (tournoi, équipe) avec group_id = null pour le cumul tournoi entier
-- (mode classement final "jeux_gagnes_tournoi", §4.9). Tenu à jour par le
-- moteur, jamais recalculé ad hoc par une vue.

create table standings (
  tournament_id uuid not null references tournaments(id) on delete cascade,
  group_id      uuid references groups(id) on delete cascade,
  team_id       uuid not null references teams(id) on delete cascade,
  joues         integer not null default 0,
  v             integer not null default 0,
  d             integer not null default 0,
  sets_g        integer not null default 0,
  sets_p        integer not null default 0,
  jeux_g        integer not null default 0,
  jeux_p        integer not null default 0,
  ratio_sets    numeric,
  ratio_jeux    numeric,
  rang          integer
);

create unique index standings_group_team_uidx
  on standings(group_id, team_id) where group_id is not null;

create unique index standings_tournament_team_uidx
  on standings(tournament_id, team_id) where group_id is null;

-- ── audit ────────────────────────────────────────────────────────────────

create table audit_log (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid references tournaments(id) on delete cascade,
  acteur        text not null,
  action        text not null,
  payload       jsonb,
  created_at    timestamptz not null default now()
);

create index audit_log_tournament_id_idx on audit_log(tournament_id);
