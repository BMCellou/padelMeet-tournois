import { createClient } from "@/lib/supabase/server";
import { estAdmin } from "@/lib/staff/session";
import { versCsv } from "@/lib/liste-attente/csv";

export const dynamic = "force-dynamic";

/** Export CSV de la liste d'attente. Admin uniquement. */
export async function GET() {
  if (!(await estAdmin())) return new Response("Non autorisé.", { status: 403 });

  const supabase = await createClient();
  const { data } = await supabase
    .from("liste_attente")
    .select("prenom, nom, email, telephone, niveau, ville, created_at, notifie_at")
    .order("created_at");

  const csv = versCsv(
    ["Prénom", "Nom", "E-mail", "Téléphone", "Niveau", "Ville", "Inscrit le", "Prévenu le"],
    (data ?? []).map((r) => [r.prenom, r.nom, r.email, r.telephone, String(r.niveau), r.ville ?? "", r.created_at.slice(0, 10), r.notifie_at?.slice(0, 10) ?? ""]),
  );
  return new Response(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="liste-attente.csv"',
      "Cache-Control": "no-store",
    },
  });
}
