"use client";

import { useActionState } from "react";
import { ajouterPaire } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function ChampsJoueur({ suffixe }: { suffixe: "A" | "B" }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="space-y-1">
        <Label htmlFor={`prenom${suffixe}`}>Prénom</Label>
        <Input id={`prenom${suffixe}`} name={`prenom${suffixe}`} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`nom${suffixe}`}>Nom</Label>
        <Input id={`nom${suffixe}`} name={`nom${suffixe}`} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`sexe${suffixe}`}>Sexe (H/F)</Label>
        <Input id={`sexe${suffixe}`} name={`sexe${suffixe}`} maxLength={1} placeholder="H" />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`classement${suffixe}`}>Classement</Label>
        <Input id={`classement${suffixe}`} name={`classement${suffixe}`} placeholder="15/1" />
      </div>
    </div>
  );
}

export function PaireForm({ tournamentId }: { tournamentId: string }) {
  const [state, formAction, isPending] = useActionState(ajouterPaire, null);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="tournamentId" value={tournamentId} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ChampsJoueur suffixe="A" />
        <ChampsJoueur suffixe="B" />
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
