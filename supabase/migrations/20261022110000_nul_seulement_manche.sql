-- Un match terminé sans vainqueur (nul) n'existe que sur la phase « manche » (formats à
-- partenaires tournants). Partout ailleurs, le classement de poule, la propagation du
-- tableau et le classement final supposent un vainqueur : la base le garantit aussi, en
-- plus du contrôle applicatif (score.ts, nulAutorise).
alter table matches
  add constraint matches_nul_seulement_manche
  check (winner_id is not null or statut not in ('valide', 'forfait') or phase = 'manche');
