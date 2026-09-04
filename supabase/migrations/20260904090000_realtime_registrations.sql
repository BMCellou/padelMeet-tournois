-- L'écran Inscriptions de l'admin n'a aucun rafraîchissement en direct,
-- contrairement à la page publique : une auto-inscription (solo ou en
-- paire) faite par un participant n'apparaît qu'après un rechargement
-- manuel si l'admin avait déjà la page ouverte. `registrations` doit
-- être dans la publication realtime pour que ça devienne possible (voir
-- src/components/tournoi/RealtimeRefresher.tsx).

alter publication supabase_realtime add table registrations;
