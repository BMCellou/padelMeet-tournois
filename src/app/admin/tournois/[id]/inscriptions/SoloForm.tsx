"use client";

import { useActionState } from "react";
import { ajouterSolo } from "./actions";
import { ChampsJoueur } from "./ChampsJoueur";
import { Button } from "@/components/ui/button";

export function SoloForm({ tournamentId }: { tournamentId: string }) {
  const [state, formAction, isPending] = useActionState(ajouterSolo, null);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="tournamentId" value={tournamentId} />
      <ChampsJoueur suffixe="" tournamentId={tournamentId} />
      {state && "error" in state ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Ajout..." : "Inscrire le joueur seul"}
      </Button>
    </form>
  );
}
