-- Bug critique découvert en production : "admin_read_memberships"
-- (ajoutée dans 20260903110000_admin_lit_memberships.sql) fait
-- référence à `memberships` DEPUIS sa propre condition RLS sur
-- `memberships`. PostgreSQL réévalue les deux policies (self_read +
-- admin_read) à chaque lecture interne de la sous-requête, ce qui
-- déclenche une récursion infinie ("infinite recursion detected in
-- policy for relation memberships") — cassant TOUTE lecture de
-- memberships pour un utilisateur connecté, donc le proxy entier
-- (estAdmin/estParticipant) pour n'importe quel compte authentifié.
--
-- Le correctif standard : une fonction SECURITY DEFINER, qui s'exécute
-- avec les droits de son propriétaire (contourne RLS pour sa propre
-- lecture interne) au lieu d'une sous-requête directe soumise à RLS.

drop policy "admin_read_memberships" on memberships;

create or replace function is_admin(uid uuid) returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from memberships where user_id = uid and role = 'admin'
  );
$$;

create policy "admin_read_memberships" on memberships
  for select to authenticated using (is_admin(auth.uid()));
