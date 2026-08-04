import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminHeader } from "../../../AdminHeader";
import { AdminSidebar } from "../../../AdminSidebar";
import { GenerationForm } from "./GenerationForm";
import { CalendrierGrid, type MatchAffiche } from "./CalendrierGrid";
import { ExemptsList, type ExemptParPoule } from "./ExemptsList";
import { genererTours } from "@/lib/engine/tours";

export default async function CalendrierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: tournamentId } = await params;
  const supabase = await createClient();

  const { data: tournoi } = await supabase
    .from("tournaments")
    .select(
      "id, nom, date, heure_debut, duree_match_min, pause_min, repos_min_min, club_id",
    )
    .eq("id", tournamentId)
    .single();

  if (!tournoi) {
    notFound();
  }

  const { data: terrainsLies } = await supabase
    .from("tournament_courts")
    .select("courts(id, nom, ordre)")
    .eq("tournament_id", tournamentId);

  const terrains = (terrainsLies ?? [])
    .map((t) => t.courts)
    .filter((c): c is { id: string; nom: string; ordre: number } => !!c)
    .sort((a, b) => a.ordre - b.ordre);

  const { data: groupes } = await supabase
    .from("groups")
    .select("id, nom, ordre, group_teams(team_id, position_tirage)")
    .eq("tournament_id", tournamentId)
    .order("ordre");

  const { data: teams } = await supabase
    .from("teams")
    .select("id, nom_affiche")
    .eq("tournament_id", tournamentId);
  const nomEquipe = new Map((teams ?? []).map((t) => [t.id, t.nom_affiche]));

  const { data: matchsBruts } = await supabase
    .from("matches")
    .select(
      "id, court_id, scheduled_at, duree_estimee, group_id, round, team_a_id, team_b_id",
    )
    .eq("tournament_id", tournamentId)
    .eq("phase", "poule");

  const nomPoule = new Map((groupes ?? []).map((g) => [g.id, g.nom]));

  const matches: MatchAffiche[] = (matchsBruts ?? []).map((m) => ({
    id: m.id,
    courtId: m.court_id,
    debut: m.scheduled_at,
    dureeMin: m.duree_estimee ?? tournoi.duree_match_min ?? 25,
    teamAId: m.team_a_id!,
    teamBId: m.team_b_id!,
    teamANom: nomEquipe.get(m.team_a_id!) ?? "?",
    teamBNom: nomEquipe.get(m.team_b_id!) ?? "?",
    pouleNom: nomPoule.get(m.group_id!) ?? "?",
    round: m.round,
  }));

  const exempts: ExemptParPoule[] = (groupes ?? []).map((g) => {
    const equipeIds = [...g.group_teams]
      .sort((a, b) => (a.position_tirage ?? 0) - (b.position_tirage ?? 0))
      .map((gt) => gt.team_id);
    const tours = equipeIds.length >= 2 ? genererTours(equipeIds) : [];
    return {
      pouleNom: g.nom,
      exempts: tours
        .filter((t) => t.exempt !== null)
        .map((t) => ({
          round: t.numero,
          equipeNom: nomEquipe.get(t.exempt!) ?? "?",
        })),
    };
  });

  const dejaGenere = matches.length > 0;

  return (
    <div className="min-h-screen bg-muted/20">
      <AdminHeader />
      <div className="flex flex-col sm:flex-row">
        <AdminSidebar tournamentId={tournoi.id} tournamentNom={tournoi.nom} />
        <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-8">
          <h1 className="text-2xl font-semibold">Calendrier — {tournoi.nom}</h1>

          {!groupes || groupes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Tire d&apos;abord les poules avant de générer le calendrier.
            </p>
          ) : !terrains || terrains.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ajoute au moins un terrain avant de générer le calendrier.
            </p>
          ) : (
            <>
              {dejaGenere ? (
                <CalendrierGrid
                  tournamentId={tournamentId}
                  terrains={terrains}
                  matches={matches}
                  reposMinMin={tournoi.repos_min_min}
                />
              ) : null}

              <ExemptsList donnees={exempts} />

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {dejaGenere
                      ? "Régénérer le calendrier"
                      : "Générer le calendrier"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <GenerationForm
                    tournamentId={tournamentId}
                    regenerer={dejaGenere}
                    defaut={{
                      heureDebut: tournoi.heure_debut.slice(0, 5),
                      dureeJeuMin: tournoi.duree_match_min ?? 25,
                      rotationMin: tournoi.pause_min ?? 5,
                      reposMinMin: tournoi.repos_min_min,
                    }}
                  />
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
