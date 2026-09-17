-- Ajoute le match pour la 3e place ("petite finale"), joué entre les
-- deux perdants de demi-finale — jusqu'ici ils étaient 3es ex æquo par
-- décision assumée (voir l'ancien commentaire de classementFinal.ts).
-- Réutilise `phase = 'classement'`, déjà prévue dans le check constraint
-- d'origine mais jamais implémentée.
--
-- Mécanisme symétrique à next_match_id/next_slot (propagation du
-- VAINQUEUR), mais pour le PERDANT d'une demi-finale — seules les deux
-- demi-finales renseignent ces colonnes, pointant vers le match de
-- petite finale généré à côté du tableau principal.

alter table matches
  add column loser_next_match_id uuid references matches(id) on delete set null,
  add column loser_next_slot text check (loser_next_slot in ('a', 'b'));

create index matches_loser_next_match_id_idx on matches(loser_next_match_id);
