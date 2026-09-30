// Construction, upload et gestion des sauvegardes complètes de la base
// dans le bucket Storage privé `backups`. Le client Supabase est injecté
// (service_role depuis le cron et l'action admin — seul service_role
// contourne RLS pour lire toutes les tables sans restriction).

import { gzipSync, gunzipSync } from "node:zlib";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { TABLES_SAUVEGARDEES, backupsAPurger, cheminBackup, type DumpBackup } from "./dump";

type Client = SupabaseClient<Database>;

const BUCKET = "backups";
const GARDER_PAR_DEFAUT = 14;

async function construireDump(supabase: Client): Promise<DumpBackup> {
  const tables: Record<string, unknown[]> = {};
  for (const table of TABLES_SAUVEGARDEES) {
    // any : TABLES_SAUVEGARDEES couvre des tables de schémas Supabase gérés
    // (ex. `admins`, vestige) que les types générés ne connaissent plus tous.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).from(table).select("*");
    if (error) throw new Error(`Sauvegarde impossible (table ${table}) : ${error.message}`);
    tables[table] = data ?? [];
  }
  return { genereLe: new Date().toISOString(), tables };
}

export interface ResultatBackup {
  chemin: string;
  tailleOctets: number;
  nombreLignes: number;
}

/** Génère un dump JSON de toutes les tables, le compresse et l'upload. */
export async function creerBackup(supabase: Client, maintenant: Date = new Date()): Promise<ResultatBackup> {
  const dump = await construireDump(supabase);
  const contenu = gzipSync(Buffer.from(JSON.stringify(dump)));
  const chemin = cheminBackup(maintenant);

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(chemin, contenu, { contentType: "application/gzip", upsert: false });
  if (error) throw new Error(`Envoi de la sauvegarde impossible : ${error.message}`);

  return {
    chemin,
    tailleOctets: contenu.byteLength,
    nombreLignes: Object.values(dump.tables).reduce((s, rows) => s + rows.length, 0),
  };
}

export interface BackupListee {
  chemin: string;
  creeLe: string;
  tailleOctets: number;
  urlSignee: string | null;
}

/** Liste les sauvegardes existantes, plus récentes en premier, avec un
 * lien de téléchargement signé (valable 1h). */
export async function listerBackups(supabase: Client): Promise<BackupListee[]> {
  const { data, error } = await supabase.storage.from(BUCKET).list("", {
    sortBy: { column: "name", order: "desc" },
  });
  if (error || !data) return [];

  const fichiers = data.filter((f) => f.name.endsWith(".json.gz"));
  const urls = await Promise.all(
    fichiers.map((f) => supabase.storage.from(BUCKET).createSignedUrl(f.name, 3600)),
  );

  return fichiers.map((f, i) => ({
    chemin: f.name,
    creeLe: f.created_at ?? "",
    tailleOctets: f.metadata?.size ?? 0,
    urlSignee: urls[i].data?.signedUrl ?? null,
  }));
}

/** Supprime les sauvegardes au-delà des `garder` plus récentes. */
export async function purgerAnciennesBackups(supabase: Client, garder = GARDER_PAR_DEFAUT): Promise<string[]> {
  const { data } = await supabase.storage.from(BUCKET).list("", { sortBy: { column: "name", order: "desc" } });
  const noms = (data ?? []).filter((f) => f.name.endsWith(".json.gz")).map((f) => f.name);
  const aSupprimer = backupsAPurger(noms, garder);
  if (aSupprimer.length > 0) {
    await supabase.storage.from(BUCKET).remove(aSupprimer);
  }
  return aSupprimer;
}

/** Télécharge et décompresse une sauvegarde — utilisé pour vérifier
 * qu'un fichier stocké est bien un dump JSON exploitable. */
export async function lireBackup(supabase: Client, chemin: string): Promise<DumpBackup> {
  const { data, error } = await supabase.storage.from(BUCKET).download(chemin);
  if (error || !data) throw new Error(`Lecture de la sauvegarde impossible : ${error?.message}`);
  const buffer = Buffer.from(await data.arrayBuffer());
  return JSON.parse(gunzipSync(buffer).toString("utf-8")) as DumpBackup;
}
