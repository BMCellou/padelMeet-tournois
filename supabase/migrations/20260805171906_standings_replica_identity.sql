-- La table standings n'a pas de clé primaire (seulement deux index
-- uniques partiels), et a été ajoutée à la publication supabase_realtime.
-- Sans identité de réplication, Postgres refuse tout DELETE dessus (le
-- moteur recalcule le classement via delete+insert à chaque validation de
-- score) : "cannot delete from table standings because it does not have
-- a replica identity and publishes deletes". REPLICA IDENTITY FULL
-- contourne l'absence de PK en utilisant la ligne entière.

alter table standings replica identity full;
