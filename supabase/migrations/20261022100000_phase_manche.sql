-- Phase « manche » : une manche d'un format à partenaires tournants (Americano…),
-- jouée entre deux équipes éphémères. Un match normal à tous égards ; la saisie de
-- score, l'audit et le temps réel existants s'appliquent sans modification (seules
-- les phases poule et tableau déclenchent classement et propagation).

alter table matches drop constraint matches_phase_check;
alter table matches add constraint matches_phase_check
  check (phase in ('poule', 'tableau', 'classement', 'classement_5e', 'manche'));
