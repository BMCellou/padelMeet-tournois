"use client";

import { useActionState } from "react";
import { genererManches } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function GenererManchesForm({ tournamentId, heureDebut }: { tournamentId: string; heureDebut: string }) {
  const [state, formAction, enCours] = useActionState(genererManches, null);
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="tournamentId" value={tournamentId} />
      <div className="max-w-40 space-y-1">
        <Label htmlFor="heureDebut">Heure de début</Label>
        <Input id="heureDebut" name="heureDebut" type="time" defaultValue={heureDebut} required />
      </div>
      {state && "error" in state ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state && "success" in state && state.info ? <p className="text-sm text-muted-foreground">{state.info}</p> : null}
      <Button type="submit" disabled={enCours}>
        {enCours ? "Génération…" : "Générer les manches"}
      </Button>
    </form>
  );
}
