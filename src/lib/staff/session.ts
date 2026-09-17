import { createClient } from "@/lib/supabase/server";

export type RoleStaff =
  | { role: "admin" }
  | { role: "scorekeeper"; tournamentId: string };

/**
 * Identifie le(s) rôle(s) "staff" (admin, scoreur) de la session en
 * cours, à partir de sa propre ligne `memberships` (self-read RLS) — pas
 * besoin de service_role ici, contrairement à l'espace participant : un
 * membre du staff peut lire ses propres rôles directement.
 *
 * Un même compte peut cumuler plusieurs lignes (ex. admin + scoreur d'un
 * tournoi précis) : on renvoie la liste complète, à l'appelant de
 * décider quoi en faire (voir `estAdmin`/`tournoiScorePar`).
 */
export async function getRolesStaff(): Promise<RoleStaff[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("memberships")
    .select("role, tournament_id")
    .eq("user_id", user.id);

  return (data ?? []).map((m) =>
    m.role === "admin"
      ? { role: "admin" as const }
      : { role: "scorekeeper" as const, tournamentId: m.tournament_id! },
  );
}

export async function estAdmin(): Promise<boolean> {
  const roles = await getRolesStaff();
  return roles.some((r) => r.role === "admin");
}

/** Renvoie l'id du tournoi si la session est scoreur de CE tournoi précis. */
export async function estScoreurDuTournoi(tournamentId: string): Promise<boolean> {
  const roles = await getRolesStaff();
  return roles.some((r) => r.role === "scorekeeper" && r.tournamentId === tournamentId);
}

export interface TournoiScoreur {
  id: string;
  nom: string;
}

/**
 * Tous les tournois dont la session est scoreur, avec leur nom — un même
 * compte peut être scoreur de plusieurs tournois à la fois (une ligne
 * memberships par tournoi) ; sert à lister tous ses tournois dans la
 * sidebar, pas seulement le premier trouvé.
 */
export async function getTournoisScoreur(): Promise<TournoiScoreur[]> {
  const roles = await getRolesStaff();
  const tournamentIds = roles
    .filter((r): r is { role: "scorekeeper"; tournamentId: string } => r.role === "scorekeeper")
    .map((r) => r.tournamentId);

  if (tournamentIds.length === 0) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("tournaments")
    .select("id, nom")
    .in("id", tournamentIds)
    .order("date", { ascending: false });

  return data ?? [];
}
