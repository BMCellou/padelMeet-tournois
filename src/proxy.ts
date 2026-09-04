import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/database.types";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

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

  const pathname = request.nextUrl.pathname;

  // Un scoreur n'a accès qu'à l'écran Scores de SON tournoi assigné
  // (memberships.role='scorekeeper', tournament_id=<celui de l'URL>) :
  // on doit donc lire l'id de tournoi dans le chemin avant de trancher.
  const matchTournoi = pathname.match(new RegExp(`^/admin/tournois/(${UUID})(/.*)?$`));
  const tournamentIdDansUrl = matchTournoi?.[1] ?? null;
  const sousChemin = matchTournoi?.[2] ?? "";
  const routeScoresAutorisee = sousChemin === "" || sousChemin.startsWith("/scores");

  let estAdmin = false;
  let premierTournoiScoreur: string | null = null;
  let estScorekeeperDuTournoi = false;
  let estParticipant = false;
  if (user) {
    const [{ data: membershipsRows }, { data: playerRow }] = await Promise.all([
      supabase.from("memberships").select("role, tournament_id").eq("user_id", user.id),
      supabase.from("players").select("id").eq("user_id", user.id).maybeSingle(),
    ]);
    estAdmin = (membershipsRows ?? []).some((m) => m.role === "admin");
    premierTournoiScoreur =
      (membershipsRows ?? []).find((m) => m.role === "scorekeeper")?.tournament_id ?? null;
    estScorekeeperDuTournoi = !!(
      tournamentIdDansUrl &&
      (membershipsRows ?? []).some(
        (m) => m.role === "scorekeeper" && m.tournament_id === tournamentIdDansUrl,
      )
    );
    estParticipant = !!playerRow;
  }

  const isAdminRoute = pathname.startsWith("/admin");
  const isAdminLoginRoute = pathname === "/admin/login";
  const estStaffAutorise = estAdmin || (estScorekeeperDuTournoi && routeScoresAutorisee);

  // Un compte créé par un admin (mot de passe provisoire généré, jamais
  // choisi par la personne elle-même) doit en définir un nouveau avant
  // de pouvoir aller où que ce soit ailleurs dans l'appli — priorité sur
  // toutes les autres redirections ci-dessous.
  const isChangePasswordRoute = pathname === "/admin/definir-mot-de-passe";
  const doitChangerMotDePasse = !!user?.user_metadata?.must_change_password;
  if (doitChangerMotDePasse && !isChangePasswordRoute && (isAdminRoute || pathname.startsWith("/compte"))) {
    return NextResponse.redirect(new URL("/admin/definir-mot-de-passe", request.url));
  }

  // Un compte participant n'a pas de droit admin en base (RLS), mais on
  // le renvoie aussi hors de /admin côté navigation : sinon il verrait un
  // espace admin vide/en erreur au lieu d'un message clair. Un scoreur
  // qui s'égare hors de son écran (ex. /admin) est ramené vers SON
  // tournoi plutôt que vers un formulaire de connexion muet, puisqu'il
  // est déjà bien connecté.
  if (isAdminRoute && !isAdminLoginRoute && !isChangePasswordRoute && !estStaffAutorise) {
    const cible = premierTournoiScoreur
      ? `/admin/tournois/${premierTournoiScoreur}/scores`
      : "/admin/login";
    return NextResponse.redirect(new URL(cible, request.url));
  }

  if (isAdminLoginRoute && (estStaffAutorise || premierTournoiScoreur)) {
    const dashboardUrl = new URL(
      estAdmin ? "/admin" : `/admin/tournois/${tournamentIdDansUrl ?? premierTournoiScoreur}/scores`,
      request.url,
    );
    return NextResponse.redirect(dashboardUrl);
  }

  const isCompteRoute = pathname.startsWith("/compte");
  const isCompteAuthRoute = pathname === "/compte/connexion" || pathname === "/compte/inscription";

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
