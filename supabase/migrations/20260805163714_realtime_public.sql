-- §Lot 7 : la page publique se rafraîchit en direct (Supabase Realtime)
-- quand l'admin valide un score, déplace un match ou ajuste une poule.

alter publication supabase_realtime add table
  teams, groups, group_teams, matches, match_sets, standings;
