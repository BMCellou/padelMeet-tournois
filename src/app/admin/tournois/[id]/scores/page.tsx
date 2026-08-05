import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminHeader } from "../../../AdminHeader";
import { AdminSidebar } from "../../../AdminSidebar";
import { MatchScoreCard, type MatchAffiche } from "./MatchScoreCard";
import { StandingsTable, type LigneClassement } from "@/components/tournoi/StandingsTable";
import type { MatchFormat } from "@/lib/engine/types";

export default async function ScoresPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: tournamentId } = await params;
  const supabase = await createClient();

  const { data: tournoi } = await supabase
    .from("tournaments")
    .select("id, nom, format_config")
    .eq("id", tournamentId)
    .single();

  if (!tournoi) {
    notFound();
  }

  const format = tournoi.format_config as unknown as MatchFormat;

  const { data: groupes } = await supabase
    .from("groups")
    .select("id, nom, ordre")
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
      "id, group_id, round, statut, team_a_id, team_b_id, winner_id, match_sets(numero, jeux_a, jeux_b, tiebreak_a, tiebreak_b)",
    )
    .eq("tournament_id", tournamentId)
    .eq("phase", "poule")
    .order("round");

  const { data: standingsBrutes } = await supabase
    .from("standings")
    .select("group_id, team_id, joues, v, d, ratio_sets, ratio_jeux, rang")
    .eq("tournament_id", tournamentId)
    .order("rang");

  return (
    <div className="min-h-screen bg-muted/20">
      <AdminHeader />
      <div className="flex flex-col sm:flex-row">
        <AdminSidebar tournamentId={tournoi.id} tournamentNom={tournoi.nom} />
        <div className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-8">
          <h1 className="text-2xl font-semibold">Scores et classements — {tournoi.nom}</h1>

          {!groupes || groupes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Tire d&apos;abord les poules avant de saisir des scores.
            </p>
          ) : (
            groupes.map((g) => {
              const matchesPoule: MatchAffiche[] = (matchsBruts ?? [])
                .filter((m) => m.group_id === g.id)
                .map((m) => ({
                  id: m.id,
                  round: m.round,
                  statut: m.statut,
                  teamAId: m.team_a_id!,
                  teamBId: m.team_b_id!,
                  teamANom: nomEquipe.get(m.team_a_id!) ?? "?",
                  teamBNom: nomEquipe.get(m.team_b_id!) ?? "?",
                  winnerId: m.winner_id,
                  sets: [...m.match_sets]
                    .sort((a, b) => a.numero - b.numero)
                    .map((s) => ({
                      jeuxA: s.jeux_a,
                      jeuxB: s.jeux_b,
                      tiebreakA: s.tiebreak_a,
                      tiebreakB: s.tiebreak_b,
                    })),
                }));

              const lignesClassement: LigneClassement[] = (standingsBrutes ?? [])
                .filter((s) => s.group_id === g.id)
                .map((s) => ({
                  rang: s.rang,
                  equipeNom: nomEquipe.get(s.team_id) ?? "?",
                  joues: s.joues,
                  v: s.v,
                  d: s.d,
                  ratioSets: s.ratio_sets,
                  ratioJeux: s.ratio_jeux,
                }));

              return (
                <Card key={g.id}>
                  <CardHeader>
                    <CardTitle className="text-base">Poule {g.nom}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <StandingsTable lignes={lignesClassement} />
                    <div className="space-y-2">
                      {matchesPoule.map((m) => (
                        <MatchScoreCard
                          key={m.id}
                          tournamentId={tournamentId}
                          match={m}
                          format={format}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
