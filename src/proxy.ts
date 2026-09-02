import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/database.types";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let estAdmin = false;
  let estParticipant = false;
  if (user) {
    const [{ data: adminRow }, { data: playerRow }] = await Promise.all([
      supabase.from("admins").select("user_id").eq("user_id", user.id).maybeSingle(),
      supabase.from("players").select("id").eq("user_id", user.id).maybeSingle(),
    ]);
    estAdmin = !!adminRow;
    estParticipant = !!playerRow;
  }

  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  const isAdminLoginRoute = request.nextUrl.pathname === "/admin/login";

  // Un compte participant n'a pas de droit admin en base (RLS), mais on
  // le renvoie aussi hors de /admin côté navigation : sinon il verrait un
  // espace admin vide/en erreur au lieu d'un message clair.
  if (isAdminRoute && !isAdminLoginRoute && !estAdmin) {
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminLoginRoute && estAdmin) {
    const dashboardUrl = new URL("/admin", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  const isCompteRoute = request.nextUrl.pathname.startsWith("/compte");
  const isCompteAuthRoute =
    request.nextUrl.pathname === "/compte/connexion" || request.nextUrl.pathname === "/compte/inscription";

  // On distingue "a une session" de "est un participant reconnu" (a une
  // fiche joueur) : un compte authentifié sans fiche joueur (l'admin,
  // typiquement) doit pouvoir voir /compte/connexion pour se connecter
  // avec un autre compte — sinon ce renvoi et celui de /compte (aucune
  // fiche joueur trouvée) se bouclent indéfiniment.
  if (isCompteRoute && !isCompteAuthRoute && !estParticipant) {
    const connexionUrl = new URL("/compte/connexion", request.url);
    return NextResponse.redirect(connexionUrl);
  }

  if (isCompteAuthRoute && estParticipant) {
    const compteUrl = new URL("/compte", request.url);
    return NextResponse.redirect(compteUrl);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/compte/:path*"],
};
