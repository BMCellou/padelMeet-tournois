-- Oubli de la migration précédente : self_read_memberships ne permet à
-- un admin de lire QUE sa propre ligne, pas la liste des scoreurs
-- attribués à un tournoi (nécessaire pour l'écran d'invitation). Un
-- admin doit pouvoir lire toutes les lignes memberships.

create policy "admin_read_memberships" on memberships
  for select to authenticated using (
    exists (
      select 1 from memberships m2
      where m2.user_id = auth.uid() and m2.role = 'admin'
    )
  );
