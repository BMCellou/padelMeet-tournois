-- Bucket de stockage privé pour les sauvegardes complètes de la base
-- (export JSON de toutes les tables), générées par /api/cron/backup-db.
-- Jamais public : accès uniquement via service_role (le cron) ou un
-- admin authentifié (policy storage ci-dessous), jamais par l'API anon.

insert into storage.buckets (id, name, public)
values ('backups', 'backups', false);

create policy "admin_read_backups" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'backups'
    and exists (select 1 from memberships where user_id = auth.uid() and role = 'admin')
  );
