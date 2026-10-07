import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { AdminHeader } from "../../../AdminHeader";
import { AdminSidebar } from "../../../AdminSidebar";
import { MatchScoreCard, type MatchAffiche } from "../scores/MatchScoreCard";
import { QualifiesEditor } from "./QualifiesEditor";
import { ClassementFinalList, type LigneFinale } from "@/components/tournoi/ClassementFinalList";
import { calculerClassementFinalTableau } from "@/lib/tournoi/classementFinalAffichage";
import { calculerContexteQualification } from "@/lib/tournoi/tableauFinal";
import { comparerQualifies, messageIncoherenceTableau } from "@/lib/engine/impactQualifies";
import { estAdmin, getTournoisScoreur } from "@/lib/staff/session";
import type { MatchFormat } from "@/lib/engine/types";

export default async function TableauPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: tournamentId } = await params;
  const supabase = await createClient();
  const admin = await estAdmin();
  const tournoisScoreur = admin ? [] : await getTournoisScoreur();

  const { data: tournoi } = await supabase
    .from("tournaments")
    .select("id, nom, format_config, selection_manuelle")
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
        "id, round, statut, team_a_id, team_b_id, winner_id, format_override, match_sets(numero, jeux_a, jeux_b, tiebreak_a, tiebreak_b)",
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
        formatOverride: m.format_override as unknown as MatchFormat | null,
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
        "id, round, statut, team_a_id, team_b_id, winner_id, next_match_id, format_override, match_sets(numero, jeux_a, jeux_b, tiebreak_a, tiebreak_b)",
      )
      .eq("tournament_id", tournamentId)
      .eq("phase", "tableau")
      .order("round");

    const { data: matchPetiteFinaleBrut } = await supabase
      .from("matches")
      .select(
        "id, statut, team_a_id, team_b_id, winner_id, format_override, match_sets(numero, jeux_a, jeux_b, tiebreak_a, tiebreak_b)",
      )
      .eq("tournament_id", tournamentId)
      .eq("phase", "classement")
      .maybeSingle();

    const { data: matchClassement5eBrut } = await supabase
      .from("matches")
      .select(
        "id, statut, team_a_id, team_b_id, winner_id, format_override, match_sets(numero, jeux_a, jeux_b, tiebreak_a, tiebreak_b)",
      )
      .eq("tournament_id", tournamentId)
      .eq("phase", "classement_5e")
      .maybeSingle();

    const tableauCommence =
      (matchsBruts ?? []).some((m) => m.statut !== "a_venir") ||
      (matchPetiteFinaleBrut ? matchPetiteFinaleBrut.statut !== "a_venir" : false) ||
      (matchClassement5eBrut ? matchClassement5eBrut.statut !== "a_venir" : false);

    // Choisir/repêcher les qualifiés relève du tirage, réservé aux
    // admins — un scoreur ne voit que le tableau déjà généré (ou un
    // message d'attente), jamais ce panneau d'édition.
    let editeurQualifies: React.ReactNode = null;
    let bandeaux: React.ReactNode = null;
    const contexte = await calculerContexteQualification(supabase, tournamentId);

    // Incohérence : les qualifiés du tableau ne sont plus ceux que désignent
    // les classements de poule (ex. tournoi dont une correction a été
    // appliquée avant le garde-fou). Les choix manuels (repêchage) ne comptent pas.
    if (!("error" in contexte) && (matchsBruts ?? []).length > 0 && !tournoi.selection_manuelle) {
      const premierTour = Math.min(...matchsBruts!.map((m) => m.round));
      const dansLeTableau = [
        ...new Set(
          matchsBruts!
            .filter((m) => m.round === premierTour)
            .flatMap((m) => [m.team_a_id, m.team_b_id])
            .filter((id): id is string => !!id),
        ),
      ];
      const selonClassement = contexte.equipes.filter((e) => e.qualifieAuto).map((e) => e.teamId);
      const ecart = comparerQualifies(dansLeTableau, selonClassement);
      if (ecart.modifie) {
        bandeaux = (
          <div className="space-y-1 rounded-md border border-destructive bg-destructive/10 p-3 text-sm" role="alert">
            <p className="font-medium text-destructive">⚠️ Incohérence entre les poules et le tableau</p>
            <p>{messageIncoherenceTableau({ ...ecart, entrants: ecart.entrants, sortants: ecart.sortants }, (id) => nomEquipe.get(id) ?? "?")}</p>
            <p className="text-muted-foreground">
              {!admin
                ? "Préviens l'organisateur."
                : tableauCommence
                  ? "Le tableau a déjà commencé : seul un retour en arrière manuel (réinitialiser ses matchs joués) permet de le remettre en accord avec les poules."
                  : "Aucun match du tableau n'est joué : ouvre « Modifier les qualifiés » puis « Régénérer le tableau » pour le remettre en accord."}
            </p>
          </div>
        );
      }
    }

    // Information : tableau refait automatiquement après une correction de poule.
    if (!tableauCommence && (matchsBruts ?? []).length > 0) {
      const { data: derniereRegeneration } = await supabase
        .from("audit_log")
        .select("created_at")
        .eq("tournament_id", tournamentId)
        .eq("action", "regeneration_tableau_correction")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (derniereRegeneration) {
        bandeaux = (
          <>
            {bandeaux}
            <div className="rounded-md border border-primary/40 bg-primary/10 p-3 text-sm" role="status">
              ℹ️ Le tableau a été régénéré suite à la correction d&apos;un score de poule (
              {new Date(derniereRegeneration.created_at).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}).
            </div>
          </>
        );
      }
    }

    if (!tableauCommence) {
      if ("error" in contexte) {
        editeurQualifies = admin ? (
          <p className="text-sm text-muted-foreground">{contexte.error}</p>
        ) : null;
      } else if (admin) {
        editeurQualifies = (
          <QualifiesEditor
            tournamentId={tournamentId}
            tailleTableau={contexte.tailleTableau}
            avertissement={contexte.avertissement}
            equipes={contexte.equipes}
            dejaGenere={(matchsBruts ?? []).length > 0}
          />
        );
      }
    }

    if (!matchsBruts || matchsBruts.length === 0) {
      contenu = editeurQualifies ?? (
        <p className="text-sm text-muted-foreground">
          Le tableau final n&apos;a pas encore été généré.
        </p>
      );
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
        matchPetiteFinaleBrut ?? null,
        matchClassement5eBrut ?? null,
        (teams ?? []).map((t) => t.id),
        standingsParEquipe,
        nomEquipe,
      );

      const petiteFinaleAffichee: MatchAffiche | null =
        matchPetiteFinaleBrut && matchPetiteFinaleBrut.team_a_id && matchPetiteFinaleBrut.team_b_id
          ? {
              id: matchPetiteFinaleBrut.id,
              round: dernierTour,
              statut: matchPetiteFinaleBrut.statut,
              teamAId: matchPetiteFinaleBrut.team_a_id,
              teamBId: matchPetiteFinaleBrut.team_b_id,
              teamANom: nomEquipe.get(matchPetiteFinaleBrut.team_a_id) ?? "?",
              teamBNom: nomEquipe.get(matchPetiteFinaleBrut.team_b_id) ?? "?",
              winnerId: matchPetiteFinaleBrut.winner_id,
              formatOverride: matchPetiteFinaleBrut.format_override as unknown as MatchFormat | null,
              sets: [...matchPetiteFinaleBrut.match_sets]
                .sort((a, b) => a.numero - b.numero)
                .map((s) => ({
                  jeuxA: s.jeux_a,
                  jeuxB: s.jeux_b,
                  tiebreakA: s.tiebreak_a,
                  tiebreakB: s.tiebreak_b,
                })),
            }
          : null;

      const classement5eAffichee: MatchAffiche | null =
        matchClassement5eBrut && matchClassement5eBrut.team_a_id && matchClassement5eBrut.team_b_id
          ? {
              id: matchClassement5eBrut.id,
              round: dernierTour,
              statut: matchClassement5eBrut.statut,
              teamAId: matchClassement5eBrut.team_a_id,
              teamBId: matchClassement5eBrut.team_b_id,
              teamANom: nomEquipe.get(matchClassement5eBrut.team_a_id) ?? "?",
              teamBNom: nomEquipe.get(matchClassement5eBrut.team_b_id) ?? "?",
              winnerId: matchClassement5eBrut.winner_id,
              formatOverride: matchClassement5eBrut.format_override as unknown as MatchFormat | null,
              sets: [...matchClassement5eBrut.match_sets]
                .sort((a, b) => a.numero - b.numero)
                .map((s) => ({
                  jeuxA: s.jeux_a,
                  jeuxB: s.jeux_b,
                  tiebreakA: s.tiebreak_a,
                  tiebreakB: s.tiebreak_b,
                })),
            }
          : null;

      contenu = (
        <>
          {bandeaux}
          {editeurQualifies}
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
                    formatOverride: m.format_override as unknown as MatchFormat | null,
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
            {matchPetiteFinaleBrut ? (
              <div className="w-64 shrink-0 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Match pour la 3e place</p>
                {petiteFinaleAffichee ? (
                  <MatchScoreCard
                    tournamentId={tournamentId}
                    match={petiteFinaleAffichee}
                    format={format}
                  />
                ) : (
                  <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                    En attente des perdant·e·s de demi-finale
                  </div>
                )}
              </div>
            ) : null}
            {matchClassement5eBrut ? (
              <div className="w-64 shrink-0 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Match pour la 5e place</p>
                {classement5eAffichee ? (
                  <MatchScoreCard
                    tournamentId={tournamentId}
                    match={classement5eAffichee}
                    format={format}
                  />
                ) : (
                  <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                    En attente des 3es de poule
                  </div>
                )}
              </div>
            ) : null}
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
        <AdminSidebar
          tournamentId={tournoi.id}
          tournamentNom={tournoi.nom}
          soloScores={!admin}
          tournoisScoreur={tournoisScoreur}
        />
        <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-8">
          <h1 className="text-2xl font-semibold">Tableau final — {tournoi.nom}</h1>
          {contenu}
        </div>
      </div>
    </div>
  );
}
