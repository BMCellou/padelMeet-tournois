import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

const LIBELLES_STATUT: Record<string, string> = {
  publie: "À venir",
  en_cours: "En cours",
  termine: "Terminé",
};

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

  const tournois = [...(tournoisBruts ?? [])].sort((a, b) => {
    const o = ordreStatut(a.statut) - ordreStatut(b.statut);
    if (o !== 0) return o;
    return a.statut === "termine"
      ? b.date.localeCompare(a.date)
      : a.date.localeCompare(b.date);
  });

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
        <h1 className="text-lg font-semibold">Tournois</h1>

        {tournois.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun tournoi publié pour l&apos;instant.
          </p>
        ) : (
          <ul className="space-y-3">
            {tournois.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/t/${t.public_slug}`}
                  className="block rounded-lg border bg-background p-4 transition-colors hover:bg-accent"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{t.nom}</p>
                      <p className="text-sm text-muted-foreground">
                        {clubsParId.get(t.club_id)?.nom ?? "Club"}
                        {" · "}
                        {new Date(t.date).toLocaleDateString("fr-FR", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })}
                        {t.niveau ? ` · ${t.niveau}` : ""}
                        {t.genre ? ` · ${t.genre}` : ""}
                      </p>
                    </div>
                    <Badge variant={t.statut === "en_cours" ? "default" : "outline"} className="shrink-0">
                      {LIBELLES_STATUT[t.statut] ?? t.statut}
                    </Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
