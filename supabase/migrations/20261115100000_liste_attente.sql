-- Liste d'attente publique : des personnes laissent leurs coordonnées (lien en bio) pour être prévenues
-- quand la date et le lieu du prochain tournoi sont connus. Indépendante des tournois et des joueurs :
-- aucune de ces personnes n'a de compte, ni de fiche joueur.
--
-- Données personnelles, consentement explicite : la ligne garde la date et la version du texte accepté.
-- Aucune lecture publique ; les inscriptions passent par une action serveur (client service_role) ;
-- la lecture et la gestion sont réservées aux administrateurs. Additif : une nouvelle table, rien d'existant touché.

create table liste_attente (
  id                    uuid primary key default gen_random_uuid(),
  prenom                text not null,
  nom                   text not null,
  email                 text not null,
  telephone             text not null,
  niveau                text not null
                          check (niveau in ('debutant', 'intermediaire', 'confirme', 'competiteur')),
  -- Facultative : on ne ferme pas la porte à quelqu'un d'une autre ville.
  ville                 text,
  consentement_at       timestamptz not null default now(),
  consentement_version  text not null,
  -- Lien de désinscription envoyé dans chaque message : suppression sans compte ni mot de passe.
  token_desinscription  text not null unique default replace(gen_random_uuid()::text, '-', ''),
  notifie_at            timestamptz,
  created_at            timestamptz not null default now()
);

-- Une personne = une ligne, quelle que soit la casse de l'adresse.
create unique index liste_attente_email_idx on liste_attente (lower(email));
create index liste_attente_created_at_idx on liste_attente (created_at);

alter table liste_attente enable row level security;

create policy "admin_all_liste_attente" on liste_attente
  for all to authenticated
  using (is_admin(auth.uid()))
  with check (is_admin(auth.uid()));
