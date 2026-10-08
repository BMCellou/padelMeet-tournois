import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaireForm } from "./PaireForm";
import { SoloForm } from "./SoloForm";
import { GenererForm } from "./GenererForm";
import { JoueursList, type JoueurAffiche } from "./JoueursList";
import {
  EquipesList,
  type EquipeAffichee,
  type JoueurDisponible,
} from "./EquipesList";
import { EquipesEnAttenteList } from "./EquipesEnAttenteList";
import { SolosEnAttenteList } from "./SolosEnAttenteList";
import { AdminHeader } from "../../../AdminHeader";
import { AdminSidebar } from "../../../AdminSidebar";
import { createServiceClient } from "@/lib/supabase/service";
import { chargerPlaces } from "@/lib/inscriptions/occupation";
import { RealtimeRefresher } from "@/components/tournoi/RealtimeRefresher";
import { getFormat } from "@/lib/engine/formats";
import type { ConfigAnimation } from "@/lib/engine/formats";
import { libelleCompteurJoueurs } from "@/lib/inscriptions/places";

export default async function InscriptionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: tournamentId } = await params;
  const supabase = await createClient();

  const { data: tournoi } = await supabase
    .from("tournaments")
    .select("id, nom, format_animation, config_animation")
    .eq("id", tournamentId)
    .single();

  if (!tournoi) {
    notFound();
  }

  const format = getFormat(tournoi.format_animation);
  // Format à partenaires tournants : l'unité est le joueur, jamais la paire.
  const parJoueur = !!format.rotation;

  const { data: solosEnAttente } = await supabase
    .from("registrations")
    .select(
      "id, players(id, nom, prenom, sexe, classement_fft, telephone, email)",
    )
    .eq("tournament_id", tournamentId)
    .eq("type", "solo")
    .eq("statut", "en_attente");

  const { data: equipesToutesBrutes } = await supabase
    .from("teams")
    .select(
      "id, nom_affiche, origine, statut, team_players(players(id, nom, prenom, sexe, classement_fft, telephone, email))",
    )
    .eq("tournament_id", tournamentId)
    .eq("ephemere", false)
    .order("nom_affiche");

  const equipesBrutes = (equipesToutesBrutes ?? []).filter((e) => e.statut === "validee");
  const equipesEnAttenteBrutes = (equipesToutesBrutes ?? []).filter(
    (e) => e.statut === "en_attente",
  );

  const joueursMap = new Map<string, JoueurAffiche>();

  for (const r of solosEnAttente ?? []) {
    const p = r.players;
    if (!p) continue;
    joueursMap.set(p.id, {
      id: p.id,
      nom: p.nom,
      prenom: p.prenom,
      sexe: p.sexe,
      classementFft: p.classement_fft,
      telephone: p.telephone,
      email: p.email,
      equipeNom: null,
    });
  }

  const idsEnEquipe = new Set<string>();

  for (const e of equipesBrutes ?? []) {
    for (const tp of e.team_players) {
      const p = tp.players;
      if (!p) continue;
      idsEnEquipe.add(p.id);
      joueursMap.set(p.id, {
        id: p.id,
        nom: p.nom,
        prenom: p.prenom,
        sexe: p.sexe,
        classementFft: p.classement_fft,
        telephone: p.telephone,
        email: p.email,
        equipeNom: e.nom_affiche,
      });
    }
  }

  const joueurs = [...joueursMap.values()].sort((a, b) =>
    a.nom.localeCompare(b.nom),
  );

  const joueursDisponibles: JoueurDisponible[] = joueurs
    .filter((j) => !idsEnEquipe.has(j.id))
    .map((j) => ({ id: j.id, nomComplet: `${j.prenom} ${j.nom}` }));

  const equipes: EquipeAffichee[] = (equipesBrutes ?? []).map((e) => ({
    id: e.id,
    nomAffiche: e.nom_affiche,
    origine: e.origine,
    joueurs: e.team_players
      .filter((tp) => tp.players)
      .map((tp) => ({
        id: tp.players!.id,
        nomComplet: `${tp.players!.prenom} ${tp.players!.nom}`,
      })),
  }));

  const equipesEnAttente = equipesEnAttenteBrutes.map((e) => ({
    id: e.id,
    nomAffiche: e.nom_affiche,
  }));

  const places = await chargerPlaces(createServiceClient(), tournamentId);

  let compteurRotation: string | null = null;
  let manchesGenerees = false;
  if (format.rotation) {
    const config = (tournoi.config_animation ?? {}) as ConfigAnimation & { nbTerrains?: number };
    const { count: terrainsChoisis } = await supabase
      .from("tournament_courts")
      .select("court_id", { count: "exact", head: true })
      .eq("tournament_id", tournamentId);
    const terrains = terrainsChoisis || config.nbTerrains || Math.floor(places.occupees / 4);
    compteurRotation = libelleCompteurJoueurs(places.occupees, format.rotation.exemptesParTour(places.occupees, terrains));
    const { count } = await supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("tournament_id", tournamentId)
      .eq("phase", "manche");
    manchesGenerees = (count ?? 0) > 0;
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <RealtimeRefresher tournamentId={tournamentId} />
      <AdminHeader />
      <div className="flex flex-col sm:flex-row">
        <AdminSidebar tournamentId={tournoi.id} tournamentNom={tournoi.nom} rotation={parJoueur} />
        <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-8">
          <h1 className="text-2xl font-semibold">
            Inscriptions — {tournoi.nom}
          </h1>

          <p className="text-sm text-muted-foreground" data-testid="compteur-places">
            {compteurRotation ? `${compteurRotation}${places.illimite ? ", pas de limite." : ` — limite : ${places.max} joueurs (${places.complet ? "complet" : `${places.restantes} place(s) restante(s)`}).`}` : null}
            {!compteurRotation
              ? places.illimite
                ? `${places.occupees} joueur(s) inscrit(s), pas de limite.`
                : `${places.occupees} / ${places.max} joueurs inscrits — ${
                    places.complet ? "complet" : `${places.restantes} place(s) restante(s)`
                  }. Les ajouts faits ici ne sont pas bloqués par la limite ; seules les inscriptions en ligne le sont.`
              : null}
          </p>
          {manchesGenerees ? (
            <p className="rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
              Les manches sont déjà générées : un joueur ajouté maintenant ne figure pas dans la rotation. Annule la
              génération depuis l&apos;écran Déroulé (tant qu&apos;aucune manche n&apos;est jouée) pour l&apos;inclure.
            </p>
          ) : null}

          {!parJoueur ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ajouter une paire</CardTitle>
              </CardHeader>
              <CardContent>
                <PaireForm tournamentId={tournamentId} />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {parJoueur ? "Inscrire un joueur" : "Inscrire un joueur seul"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SoloForm tournamentId={tournamentId} libelle={parJoueur ? "Inscrire le joueur" : undefined} />
            </CardContent>
          </Card>

          {!parJoueur ? (
            <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Joueurs seuls en attente ({solosEnAttente?.length ?? 0})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <SolosEnAttenteList
                tournamentId={tournamentId}
                solos={(solosEnAttente ?? []).map((r) => ({
                  id: r.id,
                  nomComplet: `${r.players?.prenom ?? ""} ${r.players?.nom ?? ""}`.trim(),
                }))}
              />
              <GenererForm tournamentId={tournamentId} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Équipes en attente de validation ({equipesEnAttente.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EquipesEnAttenteList tournamentId={tournamentId} equipes={equipesEnAttente} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Équipes ({equipes.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <EquipesList
                tournamentId={tournamentId}
                equipes={equipes}
                joueursDisponibles={joueursDisponibles}
              />
            </CardContent>
          </Card>

            </>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Joueurs ({joueurs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <JoueursList tournamentId={tournamentId} joueurs={joueurs} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
