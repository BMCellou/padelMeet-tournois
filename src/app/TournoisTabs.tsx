"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { BrandLogo } from "@/components/BrandLogo";
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
      className="block rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-heading text-lg tracking-wide">{t.nom}</p>
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
          <Badge variant="volt" className="shrink-0">
            {cta}
          </Badge>
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
    <div className="min-h-screen bg-background">
      <header className="w-full bg-primary text-primary-foreground">
        <div className="mx-auto w-full max-w-2xl px-4 pt-4 sm:px-6">
          <div className="flex items-center justify-between gap-2">
            <BrandLogo />
            <Link
              href="/compte"
              className="shrink-0 rounded-md border border-primary-foreground/25 px-3 py-1.5 text-sm font-medium hover:bg-primary-foreground/10"
            >
              Mon compte
            </Link>
          </div>
          <div className="mt-4 flex gap-6 text-sm">
            <button
              type="button"
              onClick={() => setOnglet("tournois")}
              className={cn(
                "-mb-px border-b-2 pb-3 font-medium",
                onglet === "tournois"
                  ? "border-volt text-primary-foreground"
                  : "border-transparent text-primary-foreground/55",
              )}
            >
              Tournois
            </button>
            <button
              type="button"
              onClick={() => setOnglet("inscriptions")}
              className={cn(
                "-mb-px border-b-2 pb-3 font-medium",
                onglet === "inscriptions"
                  ? "border-volt text-primary-foreground"
                  : "border-transparent text-primary-foreground/55",
              )}
            >
              Inscriptions
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl space-y-3 p-4 sm:p-6">
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
    </div>
  );
}
