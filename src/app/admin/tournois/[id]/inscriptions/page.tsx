import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaireForm } from "./PaireForm";
import { SoloForm } from "./SoloForm";
import { GenererForm } from "./GenererForm";

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
    .select("id, players(nom, prenom)")
    .eq("tournament_id", tournamentId)
    .eq("type", "solo")
    .eq("statut", "en_attente");

  const { data: equipes } = await supabase
    .from("teams")
    .select("id, nom_affiche, origine")
    .eq("tournament_id", tournamentId)
    .order("nom_affiche");

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-8">
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
          <CardTitle className="text-base">Équipes ({equipes?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {!equipes || equipes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune équipe pour l&apos;instant.</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {equipes.map((e) => (
                <li key={e.id} className="flex items-center justify-between p-3 text-sm">
                  <span>{e.nom_affiche}</span>
                  <span className="text-muted-foreground">{e.origine}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
