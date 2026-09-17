"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface AdminSidebarProps {
  tournamentId?: string;
  tournamentNom?: string;
  /** Un scoreur n'a accès qu'aux écrans Scores et Tableau final de ses
   * tournois assignés — le reste du menu (clubs, inscriptions, tirage,
   * calendrier) ne mène qu'à des pages qui le renverront à la connexion.
   * Un même compte peut être scoreur de plusieurs tournois à la fois :
   * `tournoisScoreur` liste tous ceux dont il a la charge, pas seulement
   * celui affiché sur l'écran courant. */
  soloScores?: boolean;
  tournoisScoreur?: { id: string; nom: string }[];
}

function liensTournoi(id: string) {
  return [
    { href: `/admin/tournois/${id}`, label: "Vue d'ensemble" },
    { href: `/admin/tournois/${id}/inscriptions`, label: "Inscriptions" },
    { href: `/admin/tournois/${id}/poules`, label: "Poules et tirage" },
    { href: `/admin/tournois/${id}/calendrier`, label: "Calendrier" },
    { href: `/admin/tournois/${id}/scores`, label: "Scores et classements" },
    { href: `/admin/tournois/${id}/tableau`, label: "Tableau final" },
  ];
}

export function AdminSidebar({
  tournamentId,
  tournamentNom,
  soloScores,
  tournoisScoreur,
}: AdminSidebarProps) {
  const pathname = usePathname();

  if (soloScores) {
    const tournois =
      tournoisScoreur && tournoisScoreur.length > 0
        ? tournoisScoreur
        : tournamentId
          ? [{ id: tournamentId, nom: tournamentNom ?? "Tournoi" }]
          : [];

    return (
      <nav className="flex shrink-0 flex-col gap-1 overflow-x-auto border-b bg-background p-2 sm:w-56 sm:border-r sm:border-b-0 sm:p-4">
        {tournois.map((t) => (
          <div key={t.id} className="flex shrink-0 flex-col gap-1 sm:mb-4">
            <p className="hidden truncate px-3 text-xs font-medium text-muted-foreground sm:block">
              {t.nom}
            </p>
            <Link
              href={`/admin/tournois/${t.id}/scores`}
              className={cn(
                "shrink-0 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap",
                pathname === `/admin/tournois/${t.id}/scores`
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-accent",
              )}
            >
              Scores et classements
            </Link>
            <Link
              href={`/admin/tournois/${t.id}/tableau`}
              className={cn(
                "shrink-0 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap",
                pathname === `/admin/tournois/${t.id}/tableau`
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-accent",
              )}
            >
              Tableau final
            </Link>
          </div>
        ))}
      </nav>
    );
  }

  return (
    <nav className="flex shrink-0 gap-1 overflow-x-auto border-b bg-background p-2 sm:w-56 sm:flex-col sm:overflow-visible sm:border-r sm:border-b-0 sm:p-4">
      <Link
        href="/admin"
        className={cn(
          "shrink-0 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap",
          pathname === "/admin"
            ? "bg-primary/10 text-primary"
            : "hover:bg-accent",
        )}
      >
        Tous les tournois
      </Link>
      <Link
        href="/admin/clubs"
        className={cn(
          "shrink-0 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap",
          pathname === "/admin/clubs" ? "bg-primary/10 text-primary" : "hover:bg-accent",
        )}
      >
        Clubs
      </Link>
      <Link
        href="/admin/utilisateurs"
        className={cn(
          "shrink-0 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap",
          pathname === "/admin/utilisateurs" ? "bg-primary/10 text-primary" : "hover:bg-accent",
        )}
      >
        Utilisateurs
      </Link>
      <Link
        href="/admin/joueurs"
        className={cn(
          "shrink-0 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap",
          pathname === "/admin/joueurs" ? "bg-primary/10 text-primary" : "hover:bg-accent",
        )}
      >
        Joueurs
      </Link>

      {tournamentId ? (
        <div className="flex shrink-0 gap-1 sm:mt-4 sm:flex-col sm:gap-1">
          <p className="hidden truncate px-3 text-xs font-medium text-muted-foreground sm:block">
            {tournamentNom ?? "Tournoi"}
          </p>
          {liensTournoi(tournamentId).map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "shrink-0 rounded-md px-3 py-2 text-sm whitespace-nowrap",
                pathname === l.href
                  ? "bg-primary/10 font-medium text-primary"
                  : "hover:bg-accent",
              )}
            >
              {l.label}
            </Link>
          ))}
        </div>
      ) : null}
    </nav>
  );
}
