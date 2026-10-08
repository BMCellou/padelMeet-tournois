-- Classement individuel lisible en UNE requête par la page publique, sans recalcul ni
-- jointure : le nom affiché et les points par manche sont stockés avec la ligne (la page
-- publique ne lit jamais la table des joueurs). Alimenté à chaque validation de manche.
alter table standings_joueurs
  add column nom_affiche      text not null default '',
  add column points_par_manche numeric(8, 2) not null default 0;

-- Une manche validée met à jour le classement : le temps réel écoute cette table.
alter publication supabase_realtime add table standings_joueurs;
