"use client";

import { useActionState } from "react";
import { tirerPoules } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TirageForm({
  tournamentId,
  relance,
}: {
  tournamentId: string;
  relance: boolean;
}) {
  const [state, formAction, isPending] = useActionState(tirerPoules, null);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="tournamentId" value={tournamentId} />
      <div className="space-y-1">
        <Label htmlFor="nombrePoulesForce">
          Nombre de poules (optionnel — auto par défaut)
        </Label>
        <Input
          id="nombrePoulesForce"
          name="nombrePoulesForce"
          type="number"
          min={1}
          className="w-32"
        />
      </div>
      {state && "error" in state ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Tirage..." : relance ? "Relancer le tirage" : "Tirer au sort"}
      </Button>
    </form>
  );
}
