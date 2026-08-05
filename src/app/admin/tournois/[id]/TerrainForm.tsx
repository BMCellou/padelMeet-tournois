"use client";

import { useActionState } from "react";
import {
  ajouterTerrain,
  basculerTerrainTournoi,
  renommerTerrain,
  supprimerTerrainDuClub,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

interface Terrain {
  id: string;
  nom: string;
}

function RenommerTerrainForm({
  tournamentId,
  terrain,
}: {
  tournamentId: string;
  terrain: Terrain;
}) {
  const [state, formAction, isPending] = useActionState(renommerTerrain, null);

  return (
    <form action={formAction} className="flex flex-1 items-center gap-1">
      <input type="hidden" name="courtId" value={terrain.id} />
      <input type="hidden" name="tournamentId" value={tournamentId} />
      <Input name="nom" defaultValue={terrain.nom} className="h-8 text-sm" />
      <Button type="submit" variant="ghost" size="sm" disabled={isPending}>
        Renommer
      </Button>
      {state && "error" in state ? (
        <span className="text-xs text-destructive">{state.error}</span>
      ) : null}
    </form>
  );
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
            <li key={t.id} className="flex items-center gap-2 p-3">
              <Checkbox
                id={`terrain-${t.id}`}
                checked={selectionnes.has(t.id)}
                onCheckedChange={(checked) => basculerTerrainTournoi(tournamentId, t.id, checked)}
              />
              <RenommerTerrainForm tournamentId={tournamentId} terrain={t} />
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 text-muted-foreground"
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
