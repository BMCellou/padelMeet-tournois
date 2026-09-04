-- Un tournoi doit pouvoir être créé avant de savoir quel club l'accueillera
-- (les inscriptions peuvent commencer sans terrain ni club assignés) : le
-- club sera renseigné plus tard depuis la fiche du tournoi.

alter table tournaments alter column club_id drop not null;
