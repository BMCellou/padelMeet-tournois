import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StandingsTable, type LigneClassement } from "@/components/tournoi/StandingsTable";
import { ClassementFinalList } from "@/components/tournoi/ClassementFinalList";
import { PublicMatchCard, type MatchPublicAffiche } from "@/components/tournoi/PublicMatchCard";
import { calculerClassementFinalTableau } from "@/lib/tournoi/classementFinalAffichage";
import { formatHeureParis } from "@/lib/temps";
import { libellerTableau, type MatchTableauStructure } from "@/lib/engine/tableauLibelles";
import { getParticipantConnecte } from "@/lib/participant/session";
import { createServiceClient } from "@/lib/supabase/service";
import { chargerStatutInscription } from "./inscriptionStatus";
import { chargerPlaces } from "@/lib/inscriptions/occupation";
import { libellePlaces } from "@/lib/inscriptions/places";
import {
  InscriptionNonConnecte,
  InscriptionDejaFaite,
  InscriptionFormulaire,
} from "./InscriptionTournoi";
import { RealtimeRefresher } from "@/components/tournoi/RealtimeRefresher";
import { BrandLogo } from "@/components/BrandLogo";

export default async function PageTournoiPublic({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: tournoi } = await supabase
    .from("tournaments")
    .select("id, nom, date, statut, genre, niveau")
    .eq("public_slug", slug)
    .maybeSingle();

  if (!tournoi) {
    notFound();
  }

  const { data: groupes } = await supabase
    .from("groups")
    .select("id, nom, ordre")
    .eq("tournament_id", tournoi.id)
    .order("ordre");

  const { data: teams } = await supabase
    .from("teams")
    .select("id, nom_affiche")
    .eq("tournament_id", tournoi.id);
  const nomEquipe = new Map((teams ?? []).map((t) => [t.id, t.nom_affiche]));

  const { data: courts } = await supabase.from("courts").select("id, nom");
  const nomTerrain = new Map((courts ?? []).map((c) => [c.id, c.nom]));

  const { data: standingsBrutes } = await supabase
    .from("standings")
    .select("group_id, team_id, joues, v, d, ratio_sets, ratio_jeux, rang")
    .eq("tournament_id", tournoi.id);
  const standingsParEquipe = new Map((standingsBrutes ?? []).map((s) => [s.team_id, s]));

  const { data: matchsPouleBruts } = await supabase
    .from("matches")
    .select(
      "id, group_id, round, statut, team_a_id, team_b_id, winner_id, court_id, scheduled_at, match_sets(numero, jeux_a, jeux_b, tiebreak_a, tiebreak_b)",
    )
    .eq("tournament_id", tournoi.id)
    .eq("phase", "poule")
    .order("round");

  const { data: matchsTableauBruts } = await supabase
    .from("matches")
    .select(
      "id, round, bracket_slot, statut, team_a_id, team_b_id, winner_id, next_match_id, next_slot, loser_next_match_id, loser_next_slot, court_id, scheduled_at, match_sets(numero, jeux_a, jeux_b, tiebreak_a, tiebreak_b)",
    )
    .eq("tournament_id", tournoi.id)
    .eq("phase", "tableau")
    .order("round");

  const { data: matchPetiteFinaleBrut } = await supabase
    .from("matches")
    .select(
      "id, round, statut, team_a_id, team_b_id, winner_id, court_id, scheduled_at, match_sets(numero, jeux_a, jeux_b, tiebreak_a, tiebreak_b)",
    )
    .eq("tournament_id", tournoi.id)
    .eq("phase", "classement")
    .maybeSingle();

  const { data: matchClassement5eBrut } = await supabase
    .from("matches")
    .select(
      "id, round, statut, team_a_id, team_b_id, winner_id, court_id, scheduled_at, match_sets(numero, jeux_a, jeux_b, tiebreak_a, tiebreak_b)",
    )
    .eq("tournament_id", tournoi.id)
    .eq("phase", "classement_5e")
    .maybeSingle();

  // Étiquettes et sources (« Vainqueur du quart n°1 ») des cases du tableau
  // dont l'équipe n'est pas encore connue.
  const structureTableau: MatchTableauStructure[] = [
    ...(matchsTableauBruts ?? []).map((m) => ({
      id: m.id,
      phase: "tableau" as const,
      round: m.round,
      bracketSlot: m.bracket_slot,
      nextMatchId: m.next_match_id,
      nextSlot: m.next_slot as "a" | "b" | null,
      loserNextMatchId: m.loser_next_match_id,
      loserNextSlot: m.loser_next_slot as "a" | "b" | null,
    })),
    ...[
      matchPetiteFinaleBrut ? { m: matchPetiteFinaleBrut, phase: "classement" as const } : null,
      matchClassement5eBrut ? { m: matchClassement5eBrut, phase: "classement_5e" as const } : null,
    ]
      .filter((x): x is NonNullable<typeof x> => !!x)
      .map(({ m, phase }) => ({
        id: m.id,
        phase,
        round: m.round,
        bracketSlot: null,
        nextMatchId: null,
        nextSlot: null,
        loserNextMatchId: null,
        loserNextSlot: null,
      })),
  ];
  const libellesTableau = libellerTableau(structureTableau);

  function versMatchPublic(m: {
    id: string;
    round: number;
    statut: string;
    team_a_id: string | null;
    team_b_id: string | null;
    winner_id: string | null;
    court_id: string | null;
    scheduled_at: string | null;
    match_sets: { numero: number; jeux_a: number; jeux_b: number; tiebreak_a: number | null; tiebreak_b: number | null }[];
  }): MatchPublicAffiche | null {
    const libelle = libellesTableau.get(m.id);
    // Les poules n'ont pas de case « à venir » sans équipes ; une case de
    // tableau, si : elle affiche d'où viendra l'équipe.
    if ((!m.team_a_id || !m.team_b_id) && !libelle) return null;
    return {
      id: m.id,
      round: m.round,
      statut: m.statut,
      teamANom: m.team_a_id ? (nomEquipe.get(m.team_a_id) ?? "?") : (libelle?.sourceA ?? "À déterminer"),
      teamBNom: m.team_b_id ? (nomEquipe.get(m.team_b_id) ?? "?") : (libelle?.sourceB ?? "À déterminer"),
      teamAInconnue: !m.team_a_id,
      teamBInconnue: !m.team_b_id,
      vainqueur: m.winner_id === m.team_a_id ? "a" : m.winner_id === m.team_b_id ? "b" : null,
      sets: [...m.match_sets]
        .sort((a, b) => a.numero - b.numero)
        .map((s) => ({
          jeuxA: s.jeux_a,
          jeuxB: s.jeux_b,
          tiebreakA: s.tiebreak_a,
          tiebreakB: s.tiebreak_b,
        })),
      courtNom: m.court_id ? nomTerrain.get(m.court_id) : null,
      heure: formatHeureParis(m.scheduled_at),
    };
  }

  const poulesAffichees = (groupes ?? []).map((g) => {
    const lignesClassement: LigneClassement[] = (standingsBrutes ?? [])
      .filter((s) => s.group_id === g.id)
      .sort((a, b) => (a.rang ?? 99) - (b.rang ?? 99))
      .map((s) => ({
        rang: s.rang,
        equipeNom: nomEquipe.get(s.team_id) ?? "?",
        joues: s.joues,
        v: s.v,
        d: s.d,
        ratioSets: s.ratio_sets,
        ratioJeux: s.ratio_jeux,
      }));

    const matchs = (matchsPouleBruts ?? [])
      .filter((m) => m.group_id === g.id)
      .map(versMatchPublic)
      .filter((m): m is MatchPublicAffiche => !!m);

    return { groupe: g, lignesClassement, matchs };
  });

  const matchsTableauAffiches = (matchsTableauBruts ?? [])
    .map(versMatchPublic)
    .filter((m): m is MatchPublicAffiche => !!m);

  const toursTableau = [...new Set((matchsTableauBruts ?? []).map((m) => m.round))].sort(
    (a, b) => a - b,
  );
  const dernierTourTableau = toursTableau[toursTableau.length - 1];

  const classementFinalLignes =
    groupes && groupes.length === 1
      ? (standingsBrutes ?? [])
          .filter((s) => s.rang != null)
          .sort((a, b) => (a.rang ?? 0) - (b.rang ?? 0))
          .map((s) => ({ rang: s.rang!, equipeNom: nomEquipe.get(s.team_id) ?? "?" }))
      : calculerClassementFinalTableau(
          matchsTableauBruts ?? [],
          matchPetiteFinaleBrut ?? null,
          matchClassement5eBrut ?? null,
          (teams ?? []).map((t) => t.id),
          standingsParEquipe,
          nomEquipe,
        );

  const petiteFinaleAffichee = matchPetiteFinaleBrut ? versMatchPublic(matchPetiteFinaleBrut) : null;
  const classement5eAffichee = matchClassement5eBrut ? versMatchPublic(matchClassement5eBrut) : null;

  let sectionInscription: ReactNode = null;
  if (tournoi.statut === "publie") {
    const participant = await getParticipantConnecte();
    const service = createServiceClient();
    const places = await chargerPlaces(service, tournoi.id);
    const placesLibelle = libellePlaces(places);
    if (!participant) {
      sectionInscription = (
        <InscriptionNonConnecte slug={slug} placesLibelle={placesLibelle} complet={places.complet} />
      );
    } else {
      const statutInscription = await chargerStatutInscription(
        service,
        tournoi.id,
        participant.playerId,
      );
      sectionInscription = statutInscription.inscrit ? (
        <InscriptionDejaFaite
          libelle={statutInscription.libelle}
          enAttente={statutInscription.enAttente}
        />
      ) : (
        <InscriptionFormulaire
          tournamentId={tournoi.id}
          slug={slug}
          placesLibelle={placesLibelle}
          placesRestantes={places.restantes}
        />
      );
    }
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      <RealtimeRefresher tournamentId={tournoi.id} />

      <div className="bg-primary p-3 text-primary-foreground">
        <div className="mx-auto w-fit">
          <BrandLogo />
        </div>
      </div>

      <header className="border-b bg-card p-4 text-center">
        <h1 className="text-xl">{tournoi.nom}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {new Date(tournoi.date).toLocaleDateString("fr-FR", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
          {tournoi.niveau ? ` · ${tournoi.niveau}` : ""}
        </p>
        <Badge variant="outline" className="mt-2">
          {tournoi.statut}
        </Badge>
      </header>

      <div className="mx-auto w-full max-w-xl space-y-6 p-4">
        {sectionInscription}

        {classementFinalLignes ? <ClassementFinalList lignes={classementFinalLignes} /> : null}

        {poulesAffichees.map(({ groupe, lignesClassement, matchs }) => (
          <Card key={groupe.id}>
            <CardHeader>
              <CardTitle className="text-base">Poule {groupe.nom}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <StandingsTable lignes={lignesClassement} />
              <div className="space-y-2">
                {matchs.map((m) => (
                  <PublicMatchCard key={m.id} match={m} />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {matchsTableauAffiches.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tableau final</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {toursTableau.map((tour) => (
                <div key={tour} className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    {tour === dernierTourTableau
                      ? "Finale"
                      : tour === dernierTourTableau - 1
                        ? "Demi-finales"
                        : tour === dernierTourTableau - 2
                          ? "Quarts de finale"
                          : `Tour ${tour}`}
                  </p>
                  {matchsTableauAffiches
                    .filter((m) => m.round === tour)
                    .map((m) => (
                      <PublicMatchCard key={m.id} match={m} />
                    ))}
                </div>
              ))}
              {matchPetiteFinaleBrut ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Match pour la 3e place
                  </p>
                  {petiteFinaleAffichee ? (
                    <PublicMatchCard match={petiteFinaleAffichee} />
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      En attente des perdant·e·s de demi-finale.
                    </p>
                  )}
                </div>
              ) : null}
              {matchClassement5eBrut ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
                    Match pour la 5e place
                  </p>
                  {classement5eAffichee ? (
                    <PublicMatchCard match={classement5eAffichee} />
                  ) : (
                    <p className="text-xs text-muted-foreground">En attente des 3es de poule.</p>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
