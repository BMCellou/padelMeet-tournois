"use client";

import { useActionState } from "react";
import { ajouterPaire } from "./actions";
import { ChampsJoueur } from "./ChampsJoueur";
import { Button } from "@/components/ui/button";

export function PaireForm({ tournamentId }: { tournamentId: string }) {
  const [state, formAction, isPending] = useActionState(ajouterPaire, null);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="tournamentId" value={tournamentId} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ChampsJoueur suffixe="A" tournamentId={tournamentId} titre="Joueur 1" />
        <ChampsJoueur suffixe="B" tournamentId={tournamentId} titre="Joueur 2" />
      </div>
      {state && "error" in state ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Ajout..." : "Ajouter la paire"}
      </Button>
    </form>
  );
}
