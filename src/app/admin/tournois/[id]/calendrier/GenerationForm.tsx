"use client";

import { useActionState } from "react";
import { genererCalendrier } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function GenerationForm({
  tournamentId,
  regenerer,
  defaut,
}: {
  tournamentId: string;
  regenerer: boolean;
  defaut: { heureDebut: string; dureeJeuMin: number; rotationMin: number; reposMinMin: number };
}) {
  const [state, formAction, isPending] = useActionState(genererCalendrier, null);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="tournamentId" value={tournamentId} />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor="heureDebut">Début</Label>
          <Input
            id="heureDebut"
            name="heureDebut"
            type="time"
            defaultValue={defaut.heureDebut}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="dureeJeuMin">Jeu (min)</Label>
          <Input
            id="dureeJeuMin"
            name="dureeJeuMin"
            type="number"
            min={1}
            defaultValue={defaut.dureeJeuMin}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="rotationMin">Rotation (min)</Label>
          <Input
            id="rotationMin"
            name="rotationMin"
            type="number"
            min={0}
            defaultValue={defaut.rotationMin}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="reposMinMin">Repos min. (min)</Label>
          <Input
            id="reposMinMin"
            name="reposMinMin"
            type="number"
            min={0}
            defaultValue={defaut.reposMinMin}
            required
          />
        </div>
      </div>
      {state && "error" in state ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      <Button type="submit" disabled={isPending}>
        {isPending
          ? "Génération..."
          : regenerer
            ? "Régénérer le calendrier"
            : "Générer le calendrier"}
      </Button>
    </form>
  );
}
