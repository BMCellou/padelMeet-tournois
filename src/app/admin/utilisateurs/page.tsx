import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { AdminHeader } from "../AdminHeader";
import { AdminSidebar } from "../AdminSidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreerUtilisateurForm } from "./CreerUtilisateurForm";
import { UtilisateursList, type UtilisateurAffiche } from "./UtilisateursList";
import { JoueursSansCompteList } from "./JoueursSansCompteList";

export default async function UtilisateursPage() {
  const supabase = await createClient();
  const service = createServiceClient();

  const { data: tournois } = await supabase
    .from("tournaments")
    .select("id, nom")
    .order("date", { ascending: false });

  const { data: players } = await supabase
    .from("players")
    .select("id, user_id, nom, prenom, sexe, classement_fft, telephone, email")
    .not("user_id", "is", null);
  const playerParUserId = new Map((players ?? []).map((p) => [p.user_id!, p]));

  // Joueurs déjà inscrits (avec équipes/historique) mais sans compte —
  // le cas typique d'un·e partenaire saisi·e à la main lors d'une
  // inscription en paire, ou d'un joueur ajouté par un admin. On leur
  // permet de créer un compte (et donc d'accéder à un rôle) sans jamais
  // dupliquer leur fiche.
  const { data: joueursSansCompte } = await supabase
    .from("players")
    .select("id, nom, prenom, email")
    .is("user_id", null)
    .order("nom", { ascending: true });

  const { data: memberships } = await supabase
    .from("memberships")
    .select("id, user_id, role, tournament_id");
  const nomTournoi = new Map((tournois ?? []).map((t) => [t.id, t.nom]));

  const membershipsParUserId = new Map<string, typeof memberships>();
  for (const m of memberships ?? []) {
    const liste = membershipsParUserId.get(m.user_id) ?? [];
    liste.push(m);
    membershipsParUserId.set(m.user_id, liste);
  }

  const utilisateurs: UtilisateurAffiche[] = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data) break;
    for (const u of data.users) {
      const player = playerParUserId.get(u.id);
      const rolesUtilisateur = membershipsParUserId.get(u.id) ?? [];
      utilisateurs.push({
        userId: u.id,
        email: u.email ?? "?",
        actif: !u.banned_until || new Date(u.banned_until) <= new Date(),
        player: player
          ? {
              id: player.id,
              nom: player.nom,
              prenom: player.prenom,
              sexe: player.sexe,
              classementFft: player.classement_fft,
              telephone: player.telephone,
            }
          : null,
        roles: rolesUtilisateur.map((m) => ({
          membershipId: m.id,
          role: m.role as "admin" | "scorekeeper",
          tournamentId: m.tournament_id,
          tournamentNom: m.tournament_id ? (nomTournoi.get(m.tournament_id) ?? "?") : null,
        })),
      });
    }
    if (data.users.length < 200) break;
  }

  utilisateurs.sort((a, b) => (a.player?.nom ?? a.email).localeCompare(b.player?.nom ?? b.email));

  return (
    <div className="min-h-screen bg-muted/20">
      <AdminHeader />
      <div className="flex flex-col sm:flex-row">
        <AdminSidebar />
        <div className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-8">
          <h1 className="text-2xl font-semibold">Utilisateurs</h1>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Créer un utilisateur</CardTitle>
            </CardHeader>
            <CardContent>
              <CreerUtilisateurForm tournois={tournois ?? []} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Comptes ({utilisateurs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <UtilisateursList utilisateurs={utilisateurs} tournois={tournois ?? []} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Joueurs sans compte ({(joueursSansCompte ?? []).length})
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Déjà inscrits à un tournoi (souvent un·e partenaire saisi·e à la main),
                mais sans compte pour l&apos;instant — utile pour en faire un·e scoreur·se.
              </p>
            </CardHeader>
            <CardContent>
              <JoueursSansCompteList
                joueurs={joueursSansCompte ?? []}
                tournois={tournois ?? []}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
