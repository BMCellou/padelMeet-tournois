import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminHeader } from "../../../AdminHeader";
import { AdminSidebar } from "../../../AdminSidebar";
import { TirageForm } from "./TirageForm";
import { SeedInput } from "./SeedInput";
import { PouleView } from "./PouleView";
import { calculerRepartitionPoules } from "@/lib/engine/poules";

export default async function PoulesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: tournamentId } = await params;
  const supabase = await createClient();

  const { data: tournoi } = await supabase
    .from("tournaments")
    .select("id, nom, tirage_seed")
    .eq("id", tournamentId)
    .single();

  if (!tournoi) {
    notFound();
  }

  const { data: teams } = await supabase
    .from("teams")
    .select("id, nom_affiche, seed")
    .eq("tournament_id", tournamentId)
    .order("nom_affiche");

  const { data: groupesBruts } = await supabase
    .from("groups")
    .select("id, nom, ordre, group_teams(team_id, position_tirage)")
    .eq("tournament_id", tournamentId)
    .order("ordre");

  const { data: matchsPoule } = await supabase
    .from("matches")
    .select("id, statut")
    .eq("tournament_id", tournamentId)
    .eq("phase", "poule");

  const calendrierGenere = (matchsPoule?.length ?? 0) > 0;
  const scoresDejaSaisis = (matchsPoule ?? []).some((m) => m.statut !== "a_venir");
  const equipesParId = new Map((teams ?? []).map((t) => [t.id, t]));

  const groupes = (groupesBruts ?? []).map((g) => ({
    id: g.id,
    nom: g.nom,
    equipes: [...g.group_teams]
      .sort((a, b) => (a.position_tirage ?? 0) - (b.position_tirage ?? 0))
      .map((gt) => equipesParId.get(gt.team_id))
      .filter(
        (e): e is { id: string; nom_affiche: string; seed: number | null } =>
          !!e,
      )
      .map((e) => ({ id: e.id, nomAffiche: e.nom_affiche })),
  }));

  const dejaTire = groupes.length > 0;

  let apercu: string | null = null;
  if (!dejaTire && teams && teams.length >= 4) {
    try {
      const r = calculerRepartitionPoules(teams.length);
      apercu = `${r.nombrePoules} poule(s) de ${[...r.tailles].sort((a, b) => b - a).join("/")}`;
    } catch {
      apercu = null;
    }
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <AdminHeader />
      <div className="flex flex-col sm:flex-row">
        <AdminSidebar tournamentId={tournoi.id} tournamentNom={tournoi.nom} />
        <div className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-8">
          <h1 className="text-2xl font-semibold">Poules — {tournoi.nom}</h1>

          {dejaTire ? (
            <>
              <PouleView
                tournamentId={tournamentId}
                groupes={groupes}
                modifiable={!calendrierGenere}
              />
              {tournoi.tirage_seed ? (
                <p className="text-xs text-muted-foreground">
                  Graine du tirage : {tournoi.tirage_seed}
                </p>
              ) : null}
              {scoresDejaSaisis ? (
                <p className="text-sm text-muted-foreground">
                  Des scores ont déjà été saisis : le tirage ne peut plus être
                  relancé ni ajusté.
                </p>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      Relancer le tirage
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {calendrierGenere ? (
                      <p className="text-sm text-muted-foreground">
                        Un calendrier a déjà été généré pour ce tirage : le
                        relancer ici le supprimera, il faudra le régénérer
                        ensuite depuis l&apos;écran Calendrier.
                      </p>
                    ) : null}
                    <TirageForm tournamentId={tournamentId} relance />
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Équipes ({teams?.length ?? 0}){apercu ? ` — ${apercu}` : ""}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {!teams || teams.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Aucune équipe inscrite pour l&apos;instant.
                    </p>
                  ) : (
                    teams.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
                        <span>{t.nom_affiche}</span>
                        <SeedInput
                          tournamentId={tournamentId}
                          teamId={t.id}
                          seedActuel={t.seed}
                        />
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tirage au sort</CardTitle>
                </CardHeader>
                <CardContent>
                  <TirageForm tournamentId={tournamentId} relance={false} />
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
