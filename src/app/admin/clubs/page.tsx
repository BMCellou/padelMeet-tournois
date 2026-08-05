import { createClient } from "@/lib/supabase/server";
import { AdminHeader } from "../AdminHeader";
import { AdminSidebar } from "../AdminSidebar";
import { ClubForm } from "../club/ClubForm";
import { ClubEditDialog } from "../club/ClubEditDialog";

export default async function ClubsPage() {
  const supabase = await createClient();

  const { data: clubs } = await supabase
    .from("clubs")
    .select("id, nom, ville")
    .order("nom");

  const { data: tournois } = await supabase.from("tournaments").select("id, club_id");
  const nbTournoisParClub = new Map<string, number>();
  for (const t of tournois ?? []) {
    nbTournoisParClub.set(t.club_id, (nbTournoisParClub.get(t.club_id) ?? 0) + 1);
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <AdminHeader />
      <div className="flex flex-col sm:flex-row">
        <AdminSidebar />
        <div className="mx-auto w-full max-w-2xl space-y-6 p-4 sm:p-8">
          <h1 className="text-2xl font-semibold">Clubs</h1>

          {!clubs || clubs.length === 0 ? (
            <ClubForm />
          ) : (
            <>
              <ul className="divide-y rounded-lg border bg-background">
                {clubs.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 p-4">
                    <div>
                      <p className="font-medium">{c.nom}</p>
                      <p className="text-sm text-muted-foreground">
                        {c.ville ? `${c.ville} · ` : ""}
                        {nbTournoisParClub.get(c.id) ?? 0} tournoi(s)
                      </p>
                    </div>
                    <ClubEditDialog clubId={c.id} nom={c.nom} ville={c.ville} />
                  </li>
                ))}
              </ul>

              <ClubForm />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
