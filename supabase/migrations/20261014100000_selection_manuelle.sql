-- Vrai quand les qualifiés du tableau final ont été choisis à la main
-- (repêchage depuis l'écran Qualifiés) et diffèrent donc de la sélection
-- automatique. Dans ce cas, une correction de score de poule ne régénère
-- pas le tableau et l'écran Tableau final n'alerte pas sur un écart : le
-- choix de l'organisateur prime.

alter table tournaments
  add column selection_manuelle boolean not null default false;
