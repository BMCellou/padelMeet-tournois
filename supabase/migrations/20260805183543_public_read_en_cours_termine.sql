-- Bug réel : les policies de lecture publique ne laissaient voir un
-- tournoi que lorsque statut = 'publie' exactement. Dès que l'admin fait
-- avancer le statut vers 'en_cours' (le jour J) ou 'termine' (une fois
-- fini), la page publique et le lien /t/[slug] redevenaient invisibles —
-- au moment précis où les participants en ont besoin. Seul 'brouillon'
-- doit rester caché.

alter policy "public_read_published_tournaments" on tournaments
  using (statut in ('publie', 'en_cours', 'termine'));

alter policy "public_read_teams_of_published" on teams
  using (
    exists (
      select 1 from tournaments t
      where t.id = teams.tournament_id and t.statut in ('publie', 'en_cours', 'termine')
    )
  );

alter policy "public_read_groups_of_published" on groups
  using (
    exists (
      select 1 from tournaments t
      where t.id = groups.tournament_id and t.statut in ('publie', 'en_cours', 'termine')
    )
  );

alter policy "public_read_group_teams_of_published" on group_teams
  using (
    exists (
      select 1 from groups g
      join tournaments t on t.id = g.tournament_id
      where g.id = group_teams.group_id and t.statut in ('publie', 'en_cours', 'termine')
    )
  );

alter policy "public_read_matches_of_published" on matches
  using (
    exists (
      select 1 from tournaments t
      where t.id = matches.tournament_id and t.statut in ('publie', 'en_cours', 'termine')
    )
  );

alter policy "public_read_match_sets_of_published" on match_sets
  using (
    exists (
      select 1 from matches m
      join tournaments t on t.id = m.tournament_id
      where m.id = match_sets.match_id and t.statut in ('publie', 'en_cours', 'termine')
    )
  );

alter policy "public_read_standings_of_published" on standings
  using (
    exists (
      select 1 from tournaments t
      where t.id = standings.tournament_id and t.statut in ('publie', 'en_cours', 'termine')
    )
  );
