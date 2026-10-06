-- Format de match propre à une phase du tournoi (clés : poule, quarts,
-- demis, finale, classement), à appliquer à la place de format_config.
-- Stocké au niveau du tournoi pour survivre à la régénération des matchs
-- (tirage, tableau) et s'appliquer aux phases pas encore générées ; il est
-- recopié dans matches.format_override des matchs non commencés.

alter table tournaments
  add column format_par_phase jsonb not null default '{}'::jsonb;
