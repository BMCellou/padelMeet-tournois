"use client";

import { useActionState } from "react";
import { ajouterTerrain, supprimerTerrain } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Terrain {
  id: string;
  nom: string;
  ordre: number;
}

export function TerrainForm({
  tournamentId,
  terrains,
}: {
  tournamentId: string;
  terrains: Terrain[];
}) {
  const [state, formAction, isPending] = useActionState(ajouterTerrain, null);

  return (
    <div className="space-y-3">
      {terrains.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun terrain pour l&apos;instant.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {terrains.map((t) => (
            <li key={t.id} className="flex items-center justify-between p-3">
              <span>{t.nom}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => supprimerTerrain(t.id, tournamentId)}
              >
                Retirer
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="flex gap-2">
        <input type="hidden" name="tournamentId" value={tournamentId} />
        <Input name="nom" placeholder="Terrain 1" required className="flex-1" />
        <Button type="submit" disabled={isPending}>
          Ajouter
        </Button>
      </form>
      {state && "error" in state ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
    </div>
  );
}
