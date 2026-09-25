-- Rappels de match aux joueurs inscrits (e-mail ou WhatsApp).
--
-- - players.canal_rappel : canal préféré du joueur, e-mail par défaut.
-- - rappels_envoyes : un rappel par (match, joueur), jamais deux fois —
--   partagé entre l'envoi manuel (admin) et le cron.
-- - parametres_rappels : ligne unique. Le cron (/api/cron/rappels) ne
--   fait rien tant que cron_actif est faux : on l'activera le jour où le
--   plan Vercel autorise des exécutions plus fréquentes.

alter table players
  add column canal_rappel text not null default 'email'
    check (canal_rappel in ('email', 'whatsapp'));

create table rappels_envoyes (
  id         uuid primary key default gen_random_uuid(),
  match_id   uuid not null references matches(id) on delete cascade,
  player_id  uuid not null references players(id) on delete cascade,
  canal      text not null check (canal in ('email', 'whatsapp')),
  envoye_par text not null check (envoye_par in ('manuel', 'cron')),
  envoye_at  timestamptz not null default now(),
  unique (match_id, player_id)
);

create index rappels_envoyes_match_id_idx on rappels_envoyes(match_id);

create table parametres_rappels (
  id                 boolean primary key default true check (id),
  cron_actif         boolean not null default false,
  delai_avant_heures integer not null default 24
                       check (delai_avant_heures between 1 and 72)
);

insert into parametres_rappels default values;

alter table rappels_envoyes enable row level security;
alter table parametres_rappels enable row level security;

create policy "admin_all_rappels_envoyes" on rappels_envoyes
  for all to authenticated
  using (exists (select 1 from memberships where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from memberships where user_id = auth.uid() and role = 'admin'));

create policy "admin_all_parametres_rappels" on parametres_rappels
  for all to authenticated
  using (exists (select 1 from memberships where user_id = auth.uid() and role = 'admin'))
  with check (exists (select 1 from memberships where user_id = auth.uid() and role = 'admin'));
