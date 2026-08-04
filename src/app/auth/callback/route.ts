import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Le seul flux qui passe par ici est l'activation / réinitialisation
      // de mot de passe : jamais utilisé comme méthode de connexion courante.
      return NextResponse.redirect(`${origin}/admin/definir-mot-de-passe`);
    }
  }

  return NextResponse.redirect(`${origin}/admin/login?error=auth`);
}
