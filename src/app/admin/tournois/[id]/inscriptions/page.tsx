import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaireForm } from "./PaireForm";
import { SoloForm } from "./SoloForm";
import { GenererForm } from "./GenererForm";
import { JoueursList, type JoueurAffiche } from "./JoueursList";
import { EquipesList, type EquipeAffichee, type JoueurDisponible } from "./EquipesList";
import { AdminHeader } from "../../../AdminHeader";

export default async function InscriptionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: tournamentId } = await params;
  const supabase = await createClient();

  const { data: tournoi } = await supabase
    .from("tournaments")
    .select("id, nom")
    .eq("id", tournamentId)
    .single();

  if (!tournoi) {
    notFound();
  }

  const { data: solosEnAttente } = await supabase
    .from("registrations")
    .select("id, players(id, nom, prenom, sexe, classement_fft, telephone, email)")
    .eq("tournament_id", tournamentId)
    .eq("type", "solo")
    .eq("statut", "en_attente");

  const { data: equipesBrutes } = await supabase
    .from("teams")
    .select("id, nom_affiche, origine, team_players(players(id, nom, prenom, sexe, classement_fft, telephone, email))")
    .eq("tournament_id", tournamentId)
    .order("nom_affiche");

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

  const joueurs = [...joueursMap.values()].sort((a, b) => a.nom.localeCompare(b.nom));

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

  return (
    <div className="min-h-screen bg-muted/20">
      <AdminHeader />
      <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-8">
        <h1 className="text-2xl font-semibold">Inscriptions — {tournoi.nom}</h1>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ajouter une paire</CardTitle>
          </CardHeader>
          <CardContent>
            <PaireForm tournamentId={tournamentId} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inscrire un joueur seul</CardTitle>
          </CardHeader>
          <CardContent>
            <SoloForm tournamentId={tournamentId} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Joueurs seuls en attente ({solosEnAttente?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!solosEnAttente || solosEnAttente.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun joueur en attente.</p>
            ) : (
              <ul className="flex flex-wrap gap-2 text-sm">
                {solosEnAttente.map((r) => (
                  <li key={r.id} className="rounded-full border px-3 py-1">
                    {r.players?.prenom} {r.players?.nom}
                  </li>
                ))}
              </ul>
            )}
            <GenererForm tournamentId={tournamentId} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Équipes ({equipes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <EquipesList
              tournamentId={tournamentId}
              equipes={equipes}
              joueursDisponibles={joueursDisponibles}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Joueurs ({joueurs.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <JoueursList tournamentId={tournamentId} joueurs={joueurs} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
