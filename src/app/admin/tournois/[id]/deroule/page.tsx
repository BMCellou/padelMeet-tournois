import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFormat } from "@/lib/engine/formats";
import type { ConfigAnimation } from "@/lib/engine/formats";
import type { MatchFormat } from "@/lib/engine/types";
import { construireDeroule } from "@/lib/tournoi/deroule";
import { libelleCompteurJoueurs } from "@/lib/inscriptions/places";
import { estAdmin, getTournoisScoreur } from "@/lib/staff/session";
import { RealtimeRefresher } from "@/components/tournoi/RealtimeRefresher";
import { AdminHeader } from "../../../AdminHeader";
import { AdminSidebar } from "../../../AdminSidebar";
import { Deroule } from "./Deroule";
import { GenererManchesForm } from "./GenererManchesForm";
import { corrigerManche, reinitialiserManches, terminerRotation, validerManche } from "./actions";

export default async function DerouleAmericanoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: tournamentId } = await params;
  const supabase = await createClient();
  const admin = await estAdmin();
  const tournoisScoreur = admin ? [] : await getTournoisScoreur();

  const { data: tournoi } = await supabase
    .from("tournaments")
    .select("id, nom, statut, format_animation, format_config, config_animation, heure_debut")
    .eq("id", tournamentId)
    .single();
  if (!tournoi) notFound();

  const format = getFormat(tournoi.format_animation);
  // Les formats à poules ont leurs propres écrans : on ne teste jamais le code du format.
  if (!format.rotation) redirect(`/admin/tournois/${tournamentId}/scores`);

  const config = (tournoi.config_animation ?? {}) as ConfigAnimation;

  const [{ data: matchs }, { data: equipes }, { data: classementBrut }, { data: terrainsLies }, { data: courts }] =
    await Promise.all([
      supabase
        .from("matches")
        .select(
          "id, round, statut, court_id, scheduled_at, team_a_id, team_b_id, winner_id, match_sets(numero, jeux_a, jeux_b)",
        )
        .eq("tournament_id", tournamentId)
        .eq("phase", "manche")
        .order("round"),
      supabase
        .from("teams")
        .select("id, nom_affiche, team_players(player_id)")
        .eq("tournament_id", tournamentId)
        .eq("ephemere", true),
      supabase
        .from("standings_joueurs")
        .select("player_id, nom_affiche, manches_jouees, victoires, points_marques, difference, tours_exempt, points_par_manche, rang")
        .eq("tournament_id", tournamentId)
        .order("rang"),
      supabase.from("tournament_courts").select("court_id").eq("tournament_id", tournamentId),
      supabase.from("courts").select("id, nom, ordre"),
    ]);

  const sidebar = (
    <AdminSidebar
      tournamentId={tournoi.id}
      tournamentNom={tournoi.nom}
      soloScores={!admin}
      tournoisScoreur={tournoisScoreur}
      rotation
    />
  );

  if (!matchs || matchs.length === 0) {
    const { data: inscrits } = await supabase
      .from("registrations")
      .select("id")
      .eq("tournament_id", tournamentId)
      .eq("type", "solo")
      .neq("statut", "annule");
    const n = inscrits?.length ?? 0;
    const nbTerrains = terrainsLies?.length ?? 0;
    const verdict = format.validerEffectif(n, nbTerrains);
    return (
      <div className="min-h-screen bg-muted/20">
        <AdminHeader />
        <div className="flex flex-col sm:flex-row">
          {sidebar}
          <div className="mx-auto w-full max-w-xl space-y-4 p-4 sm:p-8">
            <h1 className="text-2xl font-semibold">Déroulé — {tournoi.nom}</h1>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Générer les manches</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>
                  {libelleCompteurJoueurs(n, format.rotation.exemptesParTour(n, nbTerrains || Math.floor(n / 4)))} ·{" "}
                  {nbTerrains} terrain{nbTerrains > 1 ? "s" : ""} · {config.nbTours ?? format.rotation.nbToursParDefaut(n)} tours
                </p>
                {!verdict.ok ? <p className="text-destructive">{verdict.message}</p> : null}
                {verdict.ok && verdict.avertissement ? <p className="text-muted-foreground">{verdict.avertissement}</p> : null}
                {admin ? (
                  <GenererManchesForm tournamentId={tournoi.id} heureDebut={tournoi.heure_debut.slice(0, 5)} />
                ) : (
                  <p className="text-muted-foreground">L&apos;organisateur doit d&apos;abord générer les manches.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const terrains = new Map((courts ?? []).map((c) => [c.id, { nom: c.nom, ordre: c.ordre }]));
  const deroule = construireDeroule({
    manches: matchs.map((m) => {
      const manche = [...m.match_sets].sort((a, b) => a.numero - b.numero)[0];
      return {
        id: m.id,
        tour: m.round,
        statut: m.statut,
        terrainId: m.court_id,
        debut: m.scheduled_at,
        teamAId: m.team_a_id,
        teamBId: m.team_b_id,
        winnerId: m.winner_id,
        pointsA: manche?.jeux_a ?? null,
        pointsB: manche?.jeux_b ?? null,
      };
    }),
    equipes: new Map(
      (equipes ?? []).map((e) => [
        e.id,
        { id: e.id, nomAffiche: e.nom_affiche, joueurIds: e.team_players.map((tp) => tp.player_id) },
      ]),
    ),
    joueurs: (classementBrut ?? []).map((l) => ({ id: l.player_id, nomAffiche: l.nom_affiche })),
    terrains,
  });

  const aucuneManchePassee = matchs.every((m) => m.statut === "a_venir");

  return (
    <div className="min-h-screen bg-muted/20">
      <RealtimeRefresher tournamentId={tournamentId} />
      <AdminHeader />
      <div className="flex flex-col sm:flex-row">
        {sidebar}
        <div className="w-full">
          <Deroule
            tournamentId={tournamentId}
            deroule={deroule}
            format={tournoi.format_config as unknown as MatchFormat}
            parManche={config.modeClassement === "par_manche"}
            termine={tournoi.statut === "termine"}
            classement={(classementBrut ?? []).map((l) => ({
              rang: l.rang,
              nomAffiche: l.nom_affiche,
              manchesJouees: l.manches_jouees,
              victoires: l.victoires,
              pointsMarques: l.points_marques,
              difference: l.difference,
              toursExempt: l.tours_exempt,
              pointsParManche: l.points_par_manche,
            }))}
            validerManche={validerManche.bind(null, tournamentId)}
            corrigerManche={corrigerManche.bind(null, tournamentId)}
            terminer={terminerRotation.bind(null, tournamentId)}
          />
          {admin && aucuneManchePassee ? (
            <form
              className="mx-auto max-w-md px-3 pb-28"
              action={async () => {
                "use server";
                await reinitialiserManches(tournamentId);
              }}
            >
              <button type="submit" className="min-h-10 text-sm text-muted-foreground underline">
                Annuler la génération (aucune manche jouée)
              </button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
