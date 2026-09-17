import { createClient } from "@/lib/supabase/server";
import { AdminHeader } from "../AdminHeader";
import { AdminSidebar } from "../AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { JoueursGlobalList, type Affectation, type JoueurGlobal } from "./JoueursGlobalList";

export default async function JoueursPage() {
  const supabase = await createClient();

  const { data: players } = await supabase
    .from("players")
    .select("id, nom, prenom, sexe, classement_fft, telephone, email, user_id")
    .order("nom");

  const { data: teamPlayers } = await supabase
    .from("team_players")
    .select("player_id, team_id, teams(id, nom_affiche, tournament_id, tournaments(nom))");

  const { data: registrations } = await supabase
    .from("registrations")
    .select("id, player_id, tournament_id, statut, tournaments(nom)")
    .eq("type", "solo")
    .not("player_id", "is", null);

  const affectationsParJoueur = new Map<string, Affectation[]>();

  for (const tp of teamPlayers ?? []) {
    const team = tp.teams;
    if (!team) continue;
    const liste = affectationsParJoueur.get(tp.player_id) ?? [];
    liste.push({
      type: "equipe",
      teamId: team.id,
      tournamentId: team.tournament_id,
      tournamentNom: team.tournaments?.nom ?? "?",
      equipeNom: team.nom_affiche,
    });
    affectationsParJoueur.set(tp.player_id, liste);
  }

  for (const r of registrations ?? []) {
    if (!r.player_id) continue;
    const liste = affectationsParJoueur.get(r.player_id) ?? [];
    liste.push({
      type: "solo",
      registrationId: r.id,
      tournamentId: r.tournament_id,
      tournamentNom: r.tournaments?.nom ?? "?",
      statut: r.statut,
    });
    affectationsParJoueur.set(r.player_id, liste);
  }

  const joueursAffiches: JoueurGlobal[] = (players ?? []).map((p) => ({
    id: p.id,
    nom: p.nom,
    prenom: p.prenom,
    sexe: p.sexe,
    classementFft: p.classement_fft,
    telephone: p.telephone,
    email: p.email,
    aCompte: !!p.user_id,
    affectations: affectationsParJoueur.get(p.id) ?? [],
  }));

  return (
    <div className="min-h-screen bg-muted/20">
      <AdminHeader />
      <div className="flex flex-col sm:flex-row">
        <AdminSidebar />
        <div className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-8">
          <h1 className="text-2xl font-semibold">Joueurs</h1>
          <p className="text-sm text-muted-foreground">
            Tous les joueurs, tous tournois confondus — remplace un joueur dans une équipe,
            ou supprime les fiches qui n&apos;ont jamais servi à rien.
          </p>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Joueurs ({joueursAffiches.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <JoueursGlobalList joueurs={joueursAffiches} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
