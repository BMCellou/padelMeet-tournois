"use client";

import { useTransition } from "react";
import { refuserSolo } from "./actions";
import { Button } from "@/components/ui/button";

export interface SoloEnAttente {
  /** Identifiant de l'inscription (pas du joueur). */
  id: string;
  nomComplet: string;
}

/** Joueurs seuls en attente d'appariement : chacun peut être refusé, comme une équipe en attente. */
export function SolosEnAttenteList({
  tournamentId,
  solos,
}: {
  tournamentId: string;
  solos: SoloEnAttente[];
}) {
  const [enCours, demarrer] = useTransition();

  if (solos.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun joueur en attente.</p>;
  }

  return (
    <ul className="divide-y rounded-lg border">
      {solos.map((s) => (
        <li key={s.id} className="flex items-center justify-between gap-2 p-3 text-sm">
          <span>{s.nomComplet}</span>
          <Button
            size="sm"
            variant="ghost"
            className="shrink-0 text-muted-foreground"
            disabled={enCours}
            onClick={() => demarrer(() => refuserSolo(s.id, tournamentId))}
          >
            Refuser
          </Button>
        </li>
      ))}
    </ul>
  );
}
