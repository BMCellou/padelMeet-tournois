import { getParticipantConnecte } from "@/lib/participant/session";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfilForm } from "./ProfilForm";
import { deconnexion } from "./actions";

export default async function CompteParticipantPage() {
  const participant = await getParticipantConnecte();
  if (!participant) {
    redirect("/compte/connexion");
  }

  const service = createServiceClient();
  const { data: profil } = await service
    .from("players")
    .select("nom, prenom, sexe, classement_fft, telephone, email")
    .eq("id", participant.playerId)
    .single();

  if (!profil) {
    redirect("/compte/connexion");
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background p-4 text-center">
        <div className="mx-auto flex w-fit items-center gap-2 text-xl font-semibold">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            P
          </span>
          <span>
            PadelMeet <span className="text-primary">Tournois</span>
          </span>
        </div>
      </header>

      <div className="mx-auto w-full max-w-lg space-y-6 p-4 sm:p-8">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold">
            {participant.prenom} {participant.nom}
          </h1>
          <form action={deconnexion}>
            <Button type="submit" variant="ghost" size="sm">
              Se déconnecter
            </Button>
          </form>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mon profil</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfilForm
              profil={{
                nom: profil.nom,
                prenom: profil.prenom,
                sexe: profil.sexe,
                classementFft: profil.classement_fft,
                telephone: profil.telephone,
                email: profil.email,
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Mes tournois</CardTitle>
          </CardHeader>
          <CardContent>
            <Link href="/compte/historique">
              <Button variant="outline" className="w-full">
                Voir mon historique
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
