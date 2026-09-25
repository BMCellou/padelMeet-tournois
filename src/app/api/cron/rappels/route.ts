import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { executerRappelsAuto } from "@/lib/rappels/service";

// Appelé par Vercel Cron (qui envoie `Authorization: Bearer $CRON_SECRET`).
// Sans effet tant que parametres_rappels.cron_actif est faux.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const resultat = await executerRappelsAuto(createServiceClient());
  return NextResponse.json(resultat);
}
