// Chargement des matchs à rappeler et envoi (manuel ou cron). Le client
// Supabase est injecté : client admin (RLS) depuis les actions, client
// service_role depuis le cron. Un rappel n'est enregistré dans
// `rappels_envoyes` qu'après un envoi réussi.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { construireMessage, formaterDateHeure } from "./message";
import { contactPourCanal, lienWhatsApp, type CanalRappel } from "./contact";
import { matchsDansFenetre } from "./selection";
import { libellerTableau, type MatchTableauStructure } from "@/lib/engine/tableauLibelles";
import { envoyeursReels, type Envoyeurs } from "./envoi";

type Client = SupabaseClient<Database>;

export type EnvoiPar = "manuel" | "cron";
export type ModeEnvoi = "email" | "whatsapp_api";

export interface JoueurRappel {
  playerId: string;
  prenom: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  canal: CanalRappel;
  message: string;
  sujet: string;
  /** Lien wa.me prêt à ouvrir (null si pas de numéro exploitable). */
  lienWhatsApp: string | null;
  /** Variables du modèle WhatsApp de l'API. */
  parametresModele: string[];
  deja: { canal: CanalRappel; envoyeAt: string; par: EnvoiPar } | null;
}

export interface MatchRappel {
  id: string;
  tournamentId: string;
  tournoiNom: string;
  scheduledAt: string;
  statut: string;
  teamAId: string;
  teamBId: string;
  teamANom: string;
  teamBNom: string;
  terrain: string | null;
  /** Phase du match (« Demi-finale n°1 »…) ; null pour un match de poule. */
  etiquette: string | null;
  joueursA: JoueurRappel[];
  joueursB: JoueurRappel[];
}

export async function chargerMatchsRappel(
  supabase: Client,
  options: { tournamentId?: string } = {},
): Promise<MatchRappel[]> {
  let requete = supabase
    .from("matches")
    .select(
      "id, tournament_id, phase, scheduled_at, statut, team_a_id, team_b_id, court_id, tournaments(nom)",
    )
    .not("scheduled_at", "is", null)
    .not("team_a_id", "is", null)
    .not("team_b_id", "is", null)
    .in("statut", ["a_venir", "pret"])
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at");
  if (options.tournamentId) requete = requete.eq("tournament_id", options.tournamentId);

  const { data: matchs } = await requete;
  if (!matchs || matchs.length === 0) return [];

  const teamIds = [...new Set(matchs.flatMap((m) => [m.team_a_id!, m.team_b_id!]))];
  const courtIds = [...new Set(matchs.map((m) => m.court_id).filter((id): id is string => !!id))];
  const matchIds = matchs.map((m) => m.id);
  const tournoiIds = [...new Set(matchs.map((m) => m.tournament_id))];

  const [{ data: teams }, { data: courts }, { data: rappels }, { data: tableauBrut }] = await Promise.all([
    supabase
      .from("teams")
      .select("id, nom_affiche, team_players(players(id, prenom, nom, email, telephone, canal_rappel))")
      .in("id", teamIds),
    courtIds.length > 0
      ? supabase.from("courts").select("id, nom").in("id", courtIds)
      : Promise.resolve({ data: [] as { id: string; nom: string }[] }),
    supabase
      .from("rappels_envoyes")
      .select("match_id, player_id, canal, envoye_par, envoye_at")
      .in("match_id", matchIds),
    supabase
      .from("matches")
      .select(
        "id, tournament_id, phase, round, bracket_slot, next_match_id, next_slot, loser_next_match_id, loser_next_slot",
      )
      .in("tournament_id", tournoiIds)
      .in("phase", ["tableau", "classement", "classement_5e"]),
  ]);

  // Étiquettes de phase, calculées par tournoi (le dernier tour en dépend).
  const etiquettes = new Map<string, string>();
  for (const tid of tournoiIds) {
    const structure: MatchTableauStructure[] = (tableauBrut ?? [])
      .filter((m) => m.tournament_id === tid)
      .map((m) => ({
        id: m.id,
        phase: m.phase as MatchTableauStructure["phase"],
        round: m.round,
        bracketSlot: m.bracket_slot,
        nextMatchId: m.next_match_id,
        nextSlot: m.next_slot as "a" | "b" | null,
        loserNextMatchId: m.loser_next_match_id,
        loserNextSlot: m.loser_next_slot as "a" | "b" | null,
      }));
    for (const [id, l] of libellerTableau(structure)) etiquettes.set(id, l.etiquette);
  }

  const equipe = new Map((teams ?? []).map((t) => [t.id, t]));
  const nomTerrain = new Map((courts ?? []).map((c) => [c.id, c.nom]));
  const dejaEnvoye = new Map(
    (rappels ?? []).map((r) => [`${r.match_id}:${r.player_id}`, r]),
  );

  return matchs.map((m) => {
    const equipeA = equipe.get(m.team_a_id!);
    const equipeB = equipe.get(m.team_b_id!);
    const teamANom = equipeA?.nom_affiche ?? "?";
    const teamBNom = equipeB?.nom_affiche ?? "?";
    const terrain = m.court_id ? (nomTerrain.get(m.court_id) ?? null) : null;
    const tournoiNom = m.tournaments?.nom ?? "Tournoi";
    const etiquette = etiquettes.get(m.id) ?? null;

    function joueursDe(t: typeof equipeA, adversaires: string): JoueurRappel[] {
      return (t?.team_players ?? [])
        .map((tp) => tp.players)
        .filter((p): p is NonNullable<typeof p> => !!p)
        .map((p) => {
          const { sujet, texte } = construireMessage({
            prenom: p.prenom,
            tournoiNom,
            adversaires,
            debutISO: m.scheduled_at!,
            terrain,
            etiquette,
          });
          const tel = contactPourCanal(p, "whatsapp");
          const deja = dejaEnvoye.get(`${m.id}:${p.id}`);
          return {
            playerId: p.id,
            prenom: p.prenom,
            nom: p.nom,
            email: p.email,
            telephone: p.telephone,
            canal: p.canal_rappel as CanalRappel,
            sujet,
            message: texte,
            lienWhatsApp: tel ? lienWhatsApp(tel, texte) : null,
            parametresModele: [
              p.prenom,
              tournoiNom,
              adversaires,
              formaterDateHeure(m.scheduled_at!),
              terrain ?? "à confirmer",
            ],
            deja: deja
              ? {
                  canal: deja.canal as CanalRappel,
                  envoyeAt: deja.envoye_at,
                  par: deja.envoye_par as EnvoiPar,
                }
              : null,
          };
        });
    }

    return {
      id: m.id,
      tournamentId: m.tournament_id,
      tournoiNom,
      scheduledAt: m.scheduled_at!,
      statut: m.statut,
      teamAId: m.team_a_id!,
      teamBId: m.team_b_id!,
      teamANom,
      teamBNom,
      terrain,
      etiquette,
      joueursA: joueursDe(equipeA, teamBNom),
      joueursB: joueursDe(equipeB, teamANom),
    };
  });
}

export async function enregistrerRappel(
  supabase: Client,
  matchId: string,
  playerId: string,
  canal: CanalRappel,
  par: EnvoiPar,
): Promise<void> {
  await supabase.from("rappels_envoyes").upsert(
    { match_id: matchId, player_id: playerId, canal, envoye_par: par, envoye_at: new Date().toISOString() },
    { onConflict: "match_id,player_id" },
  );
}

/** Envoie un rappel à un joueur par le mode demandé, puis l'enregistre. */
export async function envoyerRappel(
  supabase: Client,
  joueur: JoueurRappel,
  matchId: string,
  mode: ModeEnvoi,
  par: EnvoiPar,
  envoyeurs: Envoyeurs = envoyeursReels,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const canal: CanalRappel = mode === "email" ? "email" : "whatsapp";
  const contact = contactPourCanal(joueur, canal);
  if (!contact) {
    return {
      ok: false,
      error: `${joueur.prenom} ${joueur.nom} : ${canal === "email" ? "e-mail" : "numéro"} manquant ou invalide.`,
    };
  }

  const resultat =
    mode === "email"
      ? await envoyeurs.email(contact, joueur.sujet, joueur.message)
      : await envoyeurs.whatsappApi(contact, joueur.parametresModele);

  if (!resultat.ok) return { ok: false, error: `${joueur.prenom} ${joueur.nom} : ${resultat.error}` };

  await enregistrerRappel(supabase, matchId, joueur.playerId, canal, par);
  return { ok: true };
}

export interface BilanEnvoi {
  envoyes: number;
  erreurs: string[];
}

/** Envoie, à chaque joueur pas encore prévenu, un rappel via son canal
 * préféré (WhatsApp uniquement par l'API — jamais de lien en masse). */
export async function envoyerRappelsMatchs(
  supabase: Client,
  matchs: MatchRappel[],
  par: EnvoiPar,
  envoyeurs: Envoyeurs = envoyeursReels,
): Promise<BilanEnvoi> {
  const bilan: BilanEnvoi = { envoyes: 0, erreurs: [] };
  for (const m of matchs) {
    for (const j of [...m.joueursA, ...m.joueursB]) {
      if (j.deja) continue;
      const mode: ModeEnvoi = j.canal === "email" ? "email" : "whatsapp_api";
      const r = await envoyerRappel(supabase, j, m.id, mode, par, envoyeurs);
      if (r.ok) bilan.envoyes++;
      else bilan.erreurs.push(r.error);
    }
  }
  return bilan;
}

export interface ParametresRappels {
  cronActif: boolean;
  delaiAvantHeures: number;
}

export async function lireParametresRappels(supabase: Client): Promise<ParametresRappels> {
  const { data } = await supabase
    .from("parametres_rappels")
    .select("cron_actif, delai_avant_heures")
    .single();
  return { cronActif: data?.cron_actif ?? false, delaiAvantHeures: data?.delai_avant_heures ?? 24 };
}

/** Point d'entrée du cron : ne fait rien tant que le paramètre est coupé. */
export async function executerRappelsAuto(
  supabase: Client,
  maintenant: Date = new Date(),
  envoyeurs: Envoyeurs = envoyeursReels,
): Promise<{ actif: false } | ({ actif: true } & BilanEnvoi)> {
  const params = await lireParametresRappels(supabase);
  if (!params.cronActif) return { actif: false };

  const tous = await chargerMatchsRappel(supabase);
  const aRappeler = matchsDansFenetre(tous, maintenant, params.delaiAvantHeures);
  const bilan = await envoyerRappelsMatchs(supabase, aRappeler, "cron", envoyeurs);
  return { actif: true, ...bilan };
}
