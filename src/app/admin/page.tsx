import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClubForm } from "./club/ClubForm";
import { AdminHeader } from "./AdminHeader";
import { AdminSidebar } from "./AdminSidebar";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const { data: clubs } = await supabase
    .from("clubs")
    .select("id, nom, ville")
    .order("nom");

  const { data: tournois } = clubs && clubs.length > 0
    ? await supabase
        .from("tournaments")
        .select("id, nom, date, statut, club_id")
        .order("date", { ascending: false })
    : { data: null };

  const clubsParId = new Map((clubs ?? []).map((c) => [c.id, c]));

  return (
    <div className="min-h-screen bg-muted/20">
      <AdminHeader />
      <div className="flex flex-col sm:flex-row">
        <AdminSidebar />
        <div className="mx-auto w-full max-w-4xl space-y-4 p-4 sm:p-8">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h1 className="text-2xl font-semibold">Tournois</h1>
              <p className="text-sm text-muted-foreground">
                Tous les clubs ·{" "}
                <Link href="/admin/clubs" className="underline">
                  gérer les clubs
                </Link>
              </p>
            </div>
          </div>

          {!clubs || clubs.length === 0 ? (
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
                            {clubsParId.get(t.club_id)?.nom ?? "Club inconnu"} ·{" "}
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
    </div>
  );
}
