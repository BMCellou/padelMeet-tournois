"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface AdminSidebarProps {
  tournamentId?: string;
  tournamentNom?: string;
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

export function AdminSidebar({ tournamentId, tournamentNom }: AdminSidebarProps) {
  const pathname = usePathname();

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
