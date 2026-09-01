"use client";

import { validerEquipe, supprimerEquipe } from "./actions";
import { Button } from "@/components/ui/button";

export interface EquipeEnAttente {
  id: string;
  nomAffiche: string;
}

export function EquipesEnAttenteList({
  tournamentId,
  equipes,
}: {
  tournamentId: string;
  equipes: EquipeEnAttente[];
}) {
  if (equipes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Aucune inscription en attente.</p>
    );
  }

  return (
    <ul className="divide-y rounded-lg border">
      {equipes.map((e) => (
        <li key={e.id} className="flex items-center justify-between gap-2 p-3 text-sm">
          <span>{e.nomAffiche}</span>
          <div className="flex shrink-0 gap-1">
            <Button size="sm" onClick={() => validerEquipe(e.id, tournamentId)}>
              Valider
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
              onClick={() => supprimerEquipe(e.id, tournamentId)}
            >
              Refuser
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
