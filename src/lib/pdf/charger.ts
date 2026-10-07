// Charge, depuis la base, les données d'un tournoi pour les documents PDF.
// Client soumis aux règles de sécurité (admin) : aucune donnée de contact
// n'est lue (ni e-mail, ni téléphone) — seulement les noms des joueurs.

import type { createClient } from "@/lib/supabase/server";
import { FORMAT_PAR_DEFAUT, type MatchFormat } from "@/lib/engine/types";
import type { CritereDepartage } from "@/lib/engine/classement";
import type { FormatsParPhase } from "@/lib/engine/formatPhases";
import type { DonneesTournoi, MatchPdf } from "./types";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export async function chargerDonneesTournoi(
  supabase: SupabaseServerClient,
  tournamentId: string,
): Promise<DonneesTournoi | null> {
  const { data: tournoi } = await supabase
    .from("tournaments")
    .select(
      "nom, date, statut, genre, niveau, nb_qualifies, format_config, format_par_phase, tiebreak_rules, duree_match_min, club_id",
    )
    .eq("id", tournamentId)
    .single();
  if (!tournoi) return null;

  const [club, terrainsLies, equipes, groupes, matchs, classements] = await Promise.all([
    tournoi.club_id
      ? supabase.from("clubs").select("nom, ville").eq("id", tournoi.club_id).single()
      : Promise.resolve({ data: null }),
    supabase.from("tournament_courts").select("courts(id, nom, ordre)").eq("tournament_id", tournamentId),
    supabase
      .from("teams")
      .select("id, nom_affiche, team_players(players(prenom, nom))")
      .eq("tournament_id", tournamentId)
      .eq("statut", "validee")
      .order("nom_affiche"),
    supabase
      .from("groups")
      .select("id, nom, ordre, group_teams(team_id, position_tirage)")
      .eq("tournament_id", tournamentId)
      .order("ordre"),
    supabase
      .from("matches")
      .select(
        "id, phase, group_id, round, bracket_slot, statut, team_a_id, team_b_id, winner_id, court_id, scheduled_at, format_override, next_match_id, next_slot, loser_next_match_id, loser_next_slot, match_sets(numero, jeux_a, jeux_b, tiebreak_a, tiebreak_b)",
      )
      .eq("tournament_id", tournamentId),
    supabase
      .from("standings")
      .select("group_id, team_id, joues, v, d, sets_g, sets_p, jeux_g, jeux_p, ratio_sets, ratio_jeux, rang")
      .eq("tournament_id", tournamentId),
  ]);

  const terrains = (terrainsLies.data ?? [])
    .map((t) => t.courts)
    .filter((c): c is { id: string; nom: string; ordre: number } => !!c)
    .sort((a, b) => a.ordre - b.ordre)
    .map((c) => ({ id: c.id, nom: c.nom }));

  const matchsPdf: MatchPdf[] = (matchs.data ?? []).map((m) => ({
    id: m.id,
    phase: m.phase as MatchPdf["phase"],
    groupId: m.group_id,
    round: m.round,
    bracketSlot: m.bracket_slot,
    statut: m.statut,
    teamAId: m.team_a_id,
    teamBId: m.team_b_id,
    winnerId: m.winner_id,
    courtId: m.court_id,
    debut: m.scheduled_at,
    formatOverride: m.format_override as unknown as MatchFormat | null,
    sets: [...m.match_sets]
      .sort((a, b) => a.numero - b.numero)
      .map((s) => ({ jeuxA: s.jeux_a, jeuxB: s.jeux_b, tiebreakA: s.tiebreak_a, tiebreakB: s.tiebreak_b })),
    nextMatchId: m.next_match_id,
    nextSlot: m.next_slot as "a" | "b" | null,
    loserNextMatchId: m.loser_next_match_id,
    loserNextSlot: m.loser_next_slot as "a" | "b" | null,
  }));

  return {
    tournoi: {
      nom: tournoi.nom,
      date: tournoi.date,
      statut: tournoi.statut,
      genre: tournoi.genre,
      niveau: tournoi.niveau,
      nbQualifies: tournoi.nb_qualifies,
      formatDefaut: { ...FORMAT_PAR_DEFAUT, ...(tournoi.format_config as object as Partial<MatchFormat>) },
      formatsParPhase: (tournoi.format_par_phase ?? {}) as FormatsParPhase,
      criteres: tournoi.tiebreak_rules as unknown as CritereDepartage[],
      dureeMatchMin: tournoi.duree_match_min ?? 25,
    },
    club: club.data,
    terrains,
    equipes: (equipes.data ?? []).map((e) => ({
      id: e.id,
      nom: e.nom_affiche,
      joueurs: e.team_players
        .map((tp) => tp.players)
        .filter((p): p is { prenom: string; nom: string } => !!p)
        .map((p) => `${p.prenom} ${p.nom}`),
    })),
    poules: (groupes.data ?? []).map((g) => ({
      id: g.id,
      nom: g.nom,
      equipeIds: [...g.group_teams]
        .sort((a, b) => (a.position_tirage ?? 0) - (b.position_tirage ?? 0))
        .map((gt) => gt.team_id),
    })),
    matchs: matchsPdf,
    classements: (classements.data ?? []).map((s) => ({
      groupId: s.group_id!,
      teamId: s.team_id,
      joues: s.joues,
      v: s.v,
      d: s.d,
      setsG: s.sets_g,
      setsP: s.sets_p,
      jeuxG: s.jeux_g,
      jeuxP: s.jeux_p,
      ratioSets: s.ratio_sets,
      ratioJeux: s.ratio_jeux,
      rang: s.rang,
    })),
  };
}

/** Nom de fichier sûr (ASCII) : « dossier-organisation-open-de-bordeaux.pdf ». */
export function nomFichierPdf(prefixe: string, nomTournoi: string): string {
  const slug = nomTournoi
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${prefixe}${slug ? `-${slug}` : ""}.pdf`;
}
