-- §4.4 : paramètres de génération du calendrier, réutilisés tels quels
-- si l'admin régénère (avant que des scores soient saisis).

alter table tournaments add column heure_debut time not null default '09:00';
alter table tournaments add column repos_min_min integer not null default 15;
