-- Bug réel découvert en testant l'espace participant : les policies de
-- lecture publique (tournoi publié/en_cours/terminé, équipes, poules,
-- matchs, classements) étaient restreintes au rôle `anon`. Avant
-- l'introduction de la table `admins`, ça ne se voyait jamais : TOUT
-- utilisateur `authenticated` avait de toute façon un accès admin total
-- (`admin_all_* using (true)`), qui recouvrait large. Maintenant qu'un
-- participant est `authenticated` mais PAS admin, il perdait l'accès à la
-- page publique elle-même dès qu'il se connectait — la page renvoyait
-- 404. La lecture publique doit rester publique, connecté ou non.

alter policy "public_read_published_tournaments" on tournaments to anon, authenticated;
alter policy "public_read_teams_of_published" on teams to anon, authenticated;
alter policy "public_read_groups_of_published" on groups to anon, authenticated;
alter policy "public_read_group_teams_of_published" on group_teams to anon, authenticated;
alter policy "public_read_matches_of_published" on matches to anon, authenticated;
alter policy "public_read_match_sets_of_published" on match_sets to anon, authenticated;
alter policy "public_read_standings_of_published" on standings to anon, authenticated;
