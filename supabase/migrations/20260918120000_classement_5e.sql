-- Ajoute le match de classement pour la 5e place, joué entre les deux
-- 3es de poule non qualifiés pour le tableau final — uniquement dans le
-- cas de deux poules dont le 3e ne se qualifie pas (typiquement 2 poules
-- de 4, tableau de 4). Contrairement à la petite finale, les deux
-- équipes sont connues dès la fin des poules (pas de propagation) : le
-- match est un match autonome, sans next_match_id ni loser_next_match_id.

alter table matches drop constraint matches_phase_check;
alter table matches add constraint matches_phase_check
  check (phase in ('poule', 'tableau', 'classement', 'classement_5e'));
