-- Bug réel : le proxy renvoyait tout utilisateur authentifié hors de
-- /compte/connexion (en supposant "authentifié = participant"), tandis que
-- /compte lui-même renvoie vers /compte/connexion dès qu'aucune fiche
-- joueur n'est trouvée pour la session. Un compte authentifié SANS fiche
-- joueur (typiquement l'admin, qui ne s'est jamais inscrit comme
-- participant) tombe donc dans une boucle infinie entre les deux pages.
--
-- Le proxy doit distinguer "a une session" de "est un participant
-- reconnu" (a une ligne players), exactement comme il distingue déjà
-- "a une session" de "est admin" via la table admins. Ça suppose que la
-- session elle-même (client authenticated, pas service_role) puisse lire
-- sa PROPRE ligne players — policy manquante jusqu'ici (players n'avait
-- qu'admin_all_players, réservée aux admins).

create policy "participant_self_read_players" on players
  for select to authenticated using (user_id = auth.uid());
