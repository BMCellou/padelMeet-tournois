import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TerrainForm } from "./TerrainForm";
import { AdminHeader } from "../../AdminHeader";
import Link from "next/link";

export default async function FicheTournoiPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: tournoi } = await supabase
    .from("tournaments")
    .select(
      "id, nom, date, statut, genre, niveau, nb_qualifies, duree_match_min, pause_min, club_id",
    )
    .eq("id", id)
    .single();

  if (!tournoi) {
    notFound();
  }

  const { data: terrainsDuClub } = await supabase
    .from("courts")
    .select("id, nom, ordre")
    .eq("club_id", tournoi.club_id)
    .order("ordre");

  const { data: terrainsSelectionnes } = await supabase
    .from("tournament_courts")
    .select("court_id")
    .eq("tournament_id", tournoi.id);

  const { count: nbEquipes } = await supabase
    .from("teams")
    .select("id", { count: "exact", head: true })
    .eq("tournament_id", tournoi.id);

  return (
    <div className="min-h-screen bg-muted/20">
      <AdminHeader />
      <div className="mx-auto w-full max-w-2xl space-y-6 p-4 sm:p-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">{tournoi.nom}</h1>
            <p className="text-sm text-muted-foreground">
              {new Date(tournoi.date).toLocaleDateString("fr-FR")}
            </p>
          </div>
          <Badge variant="outline" className="w-fit">
            {tournoi.statut}
          </Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Paramètres</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <span className="text-muted-foreground">Genre : </span>
              {tournoi.genre ?? "non précisé"}
            </div>
            <div>
              <span className="text-muted-foreground">Niveau : </span>
              {tournoi.niveau ?? "non précisé"}
            </div>
            <div>
              <span className="text-muted-foreground">Qualifiés : </span>
              {tournoi.nb_qualifies}
            </div>
            <div>
              <span className="text-muted-foreground">Créneau : </span>
              {tournoi.duree_match_min} min + {tournoi.pause_min} min de pause
            </div>
            <div>
              <span className="text-muted-foreground">
                Équipes inscrites :{" "}
              </span>
              {nbEquipes ?? 0}
            </div>
            <div>
              <span className="text-muted-foreground">
                Terrains sélectionnés :{" "}
              </span>
              {(terrainsSelectionnes ?? []).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Terrains</CardTitle>
          </CardHeader>
          <CardContent>
            <TerrainForm
              tournamentId={tournoi.id}
              terrainsDuClub={terrainsDuClub ?? []}
              terrainsSelectionnesIds={(terrainsSelectionnes ?? []).map((t) => t.court_id)}
            />
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-3">
          <Link href={`/admin/tournois/${tournoi.id}/inscriptions`}>
            <Button>Gérer les inscriptions</Button>
          </Link>
          <Link href={`/admin/tournois/${tournoi.id}/poules`}>
            <Button variant="outline">Poules et tirage</Button>
          </Link>
          <Link href={`/admin/tournois/${tournoi.id}/calendrier`}>
            <Button variant="outline">Calendrier</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
