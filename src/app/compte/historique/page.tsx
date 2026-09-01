import { getParticipantConnecte } from "@/lib/participant/session";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const LIBELLES_STATUT_TOURNOI: Record<string, string> = {
  brouillon: "À venir",
  publie: "À venir",
  en_cours: "En cours",
  termine: "Terminé",
};

interface LigneHistorique {
  tournamentId: string;
  slug: string | null;
  nom: string;
  date: string;
  clubNom: string;
  statutTournoi: string;
  partenaireOuStatut: string;
  enAttenteValidation: boolean;
}

export default async function HistoriqueParticipantPage() {
  const participant = await getParticipantConnecte();
  if (!participant) {
    redirect("/compte/connexion");
  }

  const service = createServiceClient();

  const { data: mesEquipes } = await service
    .from("team_players")
    .select(
      "teams(id, nom_affiche, statut, tournament_id, tournaments(id, nom, date, statut, public_slug, club_id, clubs(nom)))",
    )
    .eq("player_id", participant.playerId);

  const { data: mesSolos } = await service
    .from("registrations")
    .select("id, statut, tournament_id, tournaments(id, nom, date, statut, public_slug, club_id, clubs(nom))")
    .eq("player_id", participant.playerId)
    .eq("type", "solo");

  const lignes: LigneHistorique[] = [];

  for (const tp of mesEquipes ?? []) {
    const equipe = tp.teams;
    const tournoi = equipe?.tournaments;
    if (!equipe || !tournoi) continue;
    lignes.push({
      tournamentId: tournoi.id,
      slug: tournoi.public_slug,
      nom: tournoi.nom,
      date: tournoi.date,
      clubNom: tournoi.clubs?.nom ?? "Club",
      statutTournoi: tournoi.statut,
      partenaireOuStatut: equipe.nom_affiche,
      enAttenteValidation: equipe.statut === "en_attente",
    });
  }

  for (const reg of mesSolos ?? []) {
    const tournoi = reg.tournaments;
    if (!tournoi) continue;
    // Si le joueur seul a déjà été apparié, l'inscription apparaît via
    // team_players ci-dessus : on n'affiche ici que ceux encore en attente
    // d'appariement, pour éviter un doublon.
    if (lignes.some((l) => l.tournamentId === tournoi.id)) continue;
    lignes.push({
      tournamentId: tournoi.id,
      slug: tournoi.public_slug,
      nom: tournoi.nom,
      date: tournoi.date,
      clubNom: tournoi.clubs?.nom ?? "Club",
      statutTournoi: tournoi.statut,
      partenaireOuStatut: "Joueur seul, en attente d'un binôme",
      enAttenteValidation: reg.statut === "en_attente",
    });
  }

  lignes.sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background p-4 text-center">
        <h1 className="text-xl font-bold">Mes tournois</h1>
      </header>

      <div className="mx-auto w-full max-w-lg space-y-3 p-4 sm:p-8">
        <Link href="/compte" className="text-sm text-muted-foreground underline">
          &larr; Retour à mon profil
        </Link>

        {lignes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Tu n&apos;es encore inscrit(e) à aucun tournoi.
          </p>
        ) : (
          <ul className="space-y-3">
            {lignes.map((l) => (
              <li key={l.tournamentId}>
                <Card>
                  <CardContent className="space-y-1 pt-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{l.nom}</p>
                        <p className="text-sm text-muted-foreground">
                          {l.clubNom} ·{" "}
                          {new Date(l.date).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {LIBELLES_STATUT_TOURNOI[l.statutTournoi] ?? l.statutTournoi}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{l.partenaireOuStatut}</p>
                    {l.enAttenteValidation ? (
                      <Badge variant="outline" className="text-muted-foreground">
                        En attente de validation par le club
                      </Badge>
                    ) : null}
                    {l.slug ? (
                      <Link href={`/t/${l.slug}`} className="block text-sm underline">
                        Voir le tournoi
                      </Link>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
