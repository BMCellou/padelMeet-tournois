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

  const { data: tournoisBruts } = await supabase
    .from("tournaments")
    .select("id, nom, date, statut, genre, niveau, public_slug, club_id")
    .in("statut", ["publie", "en_cours", "termine"]);

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
      clubNom: (t.club_id ? clubsParId.get(t.club_id)?.nom : null) ?? "Club à définir",
    }));

  return <TournoisTabs tournois={tournois} />;
}
