// Contenu et nommage d'une sauvegarde complète de la base — pur, pour
// pouvoir tester le nommage et la rétention sans base réelle.

/** Toutes les tables applicatives (hors `storage`/`auth`, gérées par
 * Supabase lui-même — `admins` a été remplacée par `memberships` et
 * n'existe plus, voir 20260903100000_memberships_et_role_scoreur.sql). */
export const TABLES_SAUVEGARDEES = [
  "clubs",
  "courts",
  "tournaments",
  "tournament_courts",
  "players",
  "teams",
  "team_players",
  "registrations",
  "groups",
  "group_teams",
  "matches",
  "match_sets",
  "standings",
  "audit_log",
  "memberships",
  "rappels_envoyes",
  "parametres_rappels",
] as const;

export type NomTable = (typeof TABLES_SAUVEGARDEES)[number];

export interface DumpBackup {
  genereLe: string;
  tables: Record<string, unknown[]>;
}

/** "backups/2026-09-30T03-00-00-000Z.json.gz" — triable par ordre alphabétique = chronologique. */
export function cheminBackup(date: Date): string {
  return `${date.toISOString().replace(/[:.]/g, "-")}.json.gz`;
}

/** Parmi des noms de fichiers triés du plus récent au plus ancien, ceux
 * à supprimer pour n'en garder que `nombreAGarder`. */
export function backupsAPurger(nomsDuPlusRecentAuPlusAncien: string[], nombreAGarder: number): string[] {
  return nomsDuPlusRecentAuPlusAncien.slice(Math.max(0, nombreAGarder));
}
