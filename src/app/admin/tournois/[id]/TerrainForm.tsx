"use client";

import { useActionState } from "react";
import { ajouterTerrain, basculerTerrainTournoi, supprimerTerrainDuClub } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface Terrain {
  id: string;
  nom: string;
}

export function TerrainForm({
  tournamentId,
  terrainsDuClub,
  terrainsSelectionnesIds,
}: {
  tournamentId: string;
  terrainsDuClub: Terrain[];
  terrainsSelectionnesIds: string[];
}) {
  const [state, formAction, isPending] = useActionState(ajouterTerrain, null);
  const selectionnes = new Set(terrainsSelectionnesIds);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Coche les terrains du club disponibles pour ce tournoi.
      </p>

      {terrainsDuClub.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun terrain au club pour l&apos;instant.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {terrainsDuClub.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-2 p-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id={`terrain-${t.id}`}
                  checked={selectionnes.has(t.id)}
                  onCheckedChange={(checked) =>
                    basculerTerrainTournoi(tournamentId, t.id, checked)
                  }
                />
                <Label htmlFor={`terrain-${t.id}`} className="cursor-pointer font-normal">
                  {t.nom}
                </Label>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => supprimerTerrainDuClub(t.id, tournamentId)}
              >
                Supprimer du club
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
