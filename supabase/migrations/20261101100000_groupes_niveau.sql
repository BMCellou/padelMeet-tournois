-- Format « poules de niveau » : le second tour réunit les équipes de même rang des poules du
-- premier tour (niveau 1 = les premiers de poule, niveau 2 = les deuxièmes, etc.). Un niveau est
-- stocké comme un groupe : les classements, matchs et écrans de poules existants s'appliquent
-- tels quels. `niveau` distingue ces groupes des poules du premier tour (null).
--
-- Additif et sans effet sur les tournois existants : colonne nullable, aucune donnée réécrite.

alter table groups add column niveau integer;

alter table groups add constraint groups_niveau_positif check (niveau is null or niveau >= 1);
