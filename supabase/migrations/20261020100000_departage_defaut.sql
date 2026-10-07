-- Ordre de départage par défaut des NOUVEAUX tournois : ajoute le mini-classement
-- (égalité à trois équipes ou plus) entre la confrontation directe, réservée aux
-- égalités à deux, et le ratio de sets. Les tournois existants gardent l'ordre
-- qu'ils ont déjà (leur colonne n'est pas modifiée) : changer les règles d'un
-- tournoi en cours changerait ses classements.

alter table tournaments
  alter column tiebreak_rules set default
    '["victoires", "confrontation_directe", "mini_classement", "ratio_sets", "ratio_jeux"]'::jsonb;
