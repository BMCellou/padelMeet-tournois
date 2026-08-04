-- §4.3 : le tirage au sort des poules doit être reproductible en cas de
-- contestation. On stocke la graine utilisée, pas le résultat recalculé.

alter table tournaments add column tirage_seed bigint;
