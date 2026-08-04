import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClubForm } from "./club/ClubForm";
import { AdminHeader } from "./AdminHeader";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const { data: club } = await supabase
    .from("clubs")
    .select("id, nom")
    .limit(1)
    .maybeSingle();

  const { data: tournois } = club
    ? await supabase
        .from("tournaments")
        .select("id, nom, date, statut")
        .eq("club_id", club.id)
        .order("date", { ascending: false })
    : { data: null };

  return (
    <div className="min-h-screen bg-muted/20">
      <AdminHeader />
      <div className="mx-auto w-full max-w-4xl space-y-4 p-4 sm:p-8">
        <div>
          <h1 className="text-2xl font-semibold">Tournois</h1>
          {club ? (
            <p className="text-sm text-muted-foreground">{club.nom}</p>
          ) : null}
        </div>

        {!club ? (
          <ClubForm />
        ) : (
          <div className="space-y-4">
            <Link href="/admin/tournois/nouveau">
              <Button>Nouveau tournoi</Button>
            </Link>

            {!tournois || tournois.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun tournoi pour l&apos;instant.
              </p>
            ) : (
              <ul className="divide-y rounded-lg border bg-background">
                {tournois.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/admin/tournois/${t.id}`}
                      className="flex items-center justify-between p-4 hover:bg-accent"
                    >
                      <div>
                        <p className="font-medium">{t.nom}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(t.date).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                      <Badge variant="outline">{t.statut}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
