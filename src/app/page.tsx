import { createClient } from "@/lib/supabase/server";
import { TournoisTabs, type TournoiAffiche } from "./TournoisTabs";

function ordreStatut(statut: string): number {
  if (statut === "en_cours") return 0;
  if (statut === "publie") return 1;
  return 2;
}

export default async function Accueil() {
  const supabase = await createClient();

  const { data: clubs } = await supabase.from("clubs").select("id, nom, ville");
  const clubsParId = new Map((clubs ?? []).map((c) => [c.id, c]));

  const { data: tournoisBruts } = clubs && clubs.length > 0
    ? await supabase
        .from("tournaments")
        .select("id, nom, date, statut, genre, niveau, public_slug, club_id")
        .in("statut", ["publie", "en_cours", "termine"])
    : { data: null };

  const tournois: TournoiAffiche[] = [...(tournoisBruts ?? [])]
    .sort((a, b) => {
      const o = ordreStatut(a.statut) - ordreStatut(b.statut);
      if (o !== 0) return o;
      return a.statut === "termine"
        ? b.date.localeCompare(a.date)
        : a.date.localeCompare(b.date);
    })
    .map((t) => ({
      id: t.id,
      nom: t.nom,
      date: t.date,
      statut: t.statut,
      genre: t.genre,
      niveau: t.niveau,
      publicSlug: t.public_slug!,
      clubNom: clubsParId.get(t.club_id)?.nom ?? "Club",
    }));

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background p-6 text-center">
        <div className="mx-auto flex w-fit items-center gap-2 text-xl font-semibold">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            P
          </span>
          <span>
            PadelMeet <span className="text-primary">Tournois</span>
          </span>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl space-y-3 p-4">
        <TournoisTabs tournois={tournois} />
      </div>
    </div>
  );
}
