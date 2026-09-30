import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { creerBackup, purgerAnciennesBackups } from "@/lib/backup/service";

// Appelé chaque nuit par Vercel Cron (voir vercel.json). Sur le plan
// gratuit Supabase, il n'y a pas de sauvegarde automatique de la base :
// ce cron en tient lieu tant qu'on n'est pas passé sur un plan Supabase
// payant.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const supabase = createServiceClient();
  try {
    const resultat = await creerBackup(supabase);
    const purges = await purgerAnciennesBackups(supabase);
    return NextResponse.json({ ok: true, ...resultat, purges });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Échec." }, { status: 500 });
  }
}
