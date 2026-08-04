"use client";

import { useActionState } from "react";
import { ajouterSolo } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SoloForm({ tournamentId }: { tournamentId: string }) {
  const [state, formAction, isPending] = useActionState(ajouterSolo, null);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="tournamentId" value={tournamentId} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor="prenom">Prénom</Label>
          <Input id="prenom" name="prenom" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="nom">Nom</Label>
          <Input id="nom" name="nom" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="sexe">Sexe (H/F)</Label>
          <Input id="sexe" name="sexe" maxLength={1} placeholder="H" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="classementFft">Classement</Label>
          <Input id="classementFft" name="classementFft" placeholder="15/1" />
        </div>
      </div>
      {state && "error" in state ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Ajout..." : "Inscrire le joueur seul"}
      </Button>
    </form>
  );
}
