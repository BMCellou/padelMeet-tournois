"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const LIBELLES_STATUT: Record<string, string> = {
  publie: "À venir",
  en_cours: "En cours",
  termine: "Terminé",
};

export interface TournoiAffiche {
  id: string;
  nom: string;
  date: string;
  statut: string;
  genre: string | null;
  niveau: string | null;
  publicSlug: string;
  clubNom: string;
}

function CarteTournoi({ t, cta }: { t: TournoiAffiche; cta?: string }) {
  return (
    <Link
      href={`/t/${t.publicSlug}`}
      className="block rounded-lg border bg-background p-4 transition-colors hover:bg-accent"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium">{t.nom}</p>
          <p className="text-sm text-muted-foreground">
            {t.clubNom}
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
        {cta ? (
          <Badge className="shrink-0">{cta}</Badge>
        ) : (
          <Badge variant={t.statut === "en_cours" ? "default" : "outline"} className="shrink-0">
            {LIBELLES_STATUT[t.statut] ?? t.statut}
          </Badge>
        )}
      </div>
    </Link>
  );
}

export function TournoisTabs({ tournois }: { tournois: TournoiAffiche[] }) {
  const [onglet, setOnglet] = useState<"tournois" | "inscriptions">("tournois");
  const inscriptibles = tournois.filter((t) => t.statut === "publie");

  return (
    <div className="space-y-3">
      <div className="flex gap-4 border-b text-sm">
        <button
          type="button"
          onClick={() => setOnglet("tournois")}
          className={cn(
            "-mb-px border-b-2 pb-2",
            onglet === "tournois"
              ? "border-primary font-medium"
              : "border-transparent text-muted-foreground",
          )}
        >
          Tournois
        </button>
        <button
          type="button"
          onClick={() => setOnglet("inscriptions")}
          className={cn(
            "-mb-px border-b-2 pb-2",
            onglet === "inscriptions"
              ? "border-primary font-medium"
              : "border-transparent text-muted-foreground",
          )}
        >
          Inscriptions
        </button>
      </div>

      {onglet === "tournois" ? (
        tournois.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun tournoi publié pour l&apos;instant.
          </p>
        ) : (
          <ul className="space-y-3">
            {tournois.map((t) => (
              <li key={t.id}>
                <CarteTournoi t={t} />
              </li>
            ))}
          </ul>
        )
      ) : inscriptibles.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucune inscription ouverte pour l&apos;instant.
        </p>
      ) : (
        <ul className="space-y-3">
          {inscriptibles.map((t) => (
            <li key={t.id}>
              <CarteTournoi t={t} cta="S'inscrire" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
