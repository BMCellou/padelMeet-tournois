-- Nombre maximum de joueurs inscrits à un tournoi (une paire = 2, un solo
-- = 1). null = pas de limite. Les inscriptions en attente comptent
-- (sinon on sur-réserverait avant validation par le club).

alter table tournaments
  add column max_participants integer
    check (max_participants is null or max_participants >= 2);
