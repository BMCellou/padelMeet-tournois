import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { AdminHeader } from "../../../AdminHeader";
import { AdminSidebar } from "../../../AdminSidebar";
import { MatchScoreCard, type MatchAffiche } from "../scores/MatchScoreCard";
import { GenererTableauForm } from "./GenererTableauForm";
import { ClassementFinalList, type LigneFinale } from "@/components/tournoi/ClassementFinalList";
import { calculerClassementFinalTableau } from "@/lib/tournoi/classementFinalAffichage";
import type { MatchFormat } from "@/lib/engine/types";

export default async function TableauPage({
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
    .select("id, nom")
    .eq("tournament_id", tournamentId);

  const { data: teams } = await supabase
    .from("teams")
    .select("id, nom_affiche")
    .eq("tournament_id", tournamentId);
  const nomEquipe = new Map((teams ?? []).map((t) => [t.id, t.nom_affiche]));

  const { data: standingsBrutes } = await supabase
    .from("standings")
    .select("team_id, joues, v, ratio_sets, ratio_jeux, rang")
    .eq("tournament_id", tournamentId);
  const standingsParEquipe = new Map((standingsBrutes ?? []).map((s) => [s.team_id, s]));

  let contenu: React.ReactNode;

  if (!groupes || groupes.length === 0) {
    contenu = (
      <p className="text-sm text-muted-foreground">
        Tire d&apos;abord les poules avant de générer le tableau final.
      </p>
    );
  } else if (groupes.length === 1) {
    const lignes: LigneFinale[] = (standingsBrutes ?? [])
      .filter((s) => s.rang != null)
      .sort((a, b) => (a.rang ?? 0) - (b.rang ?? 0))
      .map((s) => ({ rang: s.rang!, equipeNom: nomEquipe.get(s.team_id) ?? "?" }));

    const { data: matchsPouleBruts } = await supabase
      .from("matches")
      .select(
        "id, round, statut, team_a_id, team_b_id, winner_id, match_sets(numero, jeux_a, jeux_b, tiebreak_a, tiebreak_b)",
      )
      .eq("tournament_id", tournamentId)
      .eq("group_id", groupes[0].id)
      .order("round");

    const matchsPoule: MatchAffiche[] = (matchsPouleBruts ?? [])
      .filter((m) => m.team_a_id && m.team_b_id)
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

    contenu = (
      <>
        <p className="text-sm text-muted-foreground">
          Une seule poule : le classement de poule est directement le classement final.
        </p>
        <ClassementFinalList lignes={lignes} />
        <div className="space-y-2">
          <p className="text-sm font-medium">Matchs de la poule</p>
          {matchsPoule.map((m) => (
            <MatchScoreCard key={m.id} tournamentId={tournamentId} match={m} format={format} />
          ))}
        </div>
      </>
    );
  } else {
    const { data: matchsBruts } = await supabase
      .from("matches")
      .select(
        "id, round, statut, team_a_id, team_b_id, winner_id, next_match_id, match_sets(numero, jeux_a, jeux_b, tiebreak_a, tiebreak_b)",
      )
      .eq("tournament_id", tournamentId)
      .eq("phase", "tableau")
      .order("round");

    if (!matchsBruts || matchsBruts.length === 0) {
      contenu = <GenererTableauForm tournamentId={tournamentId} />;
    } else {
      const parTour = new Map<number, typeof matchsBruts>();
      for (const m of matchsBruts) {
        if (!parTour.has(m.round)) parTour.set(m.round, []);
        parTour.get(m.round)!.push(m);
      }
      const tours = [...parTour.keys()].sort((a, b) => a - b);
      const dernierTour = tours[tours.length - 1];

      const classementFinalLignes = calculerClassementFinalTableau(
        matchsBruts,
        (teams ?? []).map((t) => t.id),
        standingsParEquipe,
        nomEquipe,
      );

      contenu = (
        <>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {tours.map((tour) => (
              <div key={tour} className="w-64 shrink-0 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">
                  {tour === dernierTour
                    ? "Finale"
                    : tour === dernierTour - 1
                      ? "Demi-finales"
                      : tour === dernierTour - 2
                        ? "Quarts de finale"
                        : `Tour ${tour}`}
                </p>
                {parTour.get(tour)!.map((m) => {
                  if (!m.team_a_id || !m.team_b_id) {
                    return (
                      <div
                        key={m.id}
                        className="rounded-md border border-dashed p-3 text-xs text-muted-foreground"
                      >
                        En attente des vainqueurs précédents
                      </div>
                    );
                  }
                  const match: MatchAffiche = {
                    id: m.id,
                    round: m.round,
                    statut: m.statut,
                    teamAId: m.team_a_id,
                    teamBId: m.team_b_id,
                    teamANom: nomEquipe.get(m.team_a_id) ?? "?",
                    teamBNom: nomEquipe.get(m.team_b_id) ?? "?",
                    winnerId: m.winner_id,
                    sets: [...m.match_sets]
                      .sort((a, b) => a.numero - b.numero)
                      .map((s) => ({
                        jeuxA: s.jeux_a,
                        jeuxB: s.jeux_b,
                        tiebreakA: s.tiebreak_a,
                        tiebreakB: s.tiebreak_b,
                      })),
                  };
                  return (
                    <MatchScoreCard
                      key={m.id}
                      tournamentId={tournamentId}
                      match={match}
                      format={format}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {classementFinalLignes ? (
            <ClassementFinalList lignes={classementFinalLignes} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Le classement final s&apos;affichera une fois la finale validée.
            </p>
          )}
        </>
      );
    }
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <AdminHeader />
      <div className="flex flex-col sm:flex-row">
        <AdminSidebar tournamentId={tournoi.id} tournamentNom={tournoi.nom} />
        <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-8">
          <h1 className="text-2xl font-semibold">Tableau final — {tournoi.nom}</h1>
          {contenu}
        </div>
      </div>
    </div>
  );
}
