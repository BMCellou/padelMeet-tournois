"use client";

import { useActionState } from "react";
import { genererEquipesAleatoires } from "./actions";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const LIBELLES_STRATEGIE: Record<string, string> = {
  aleatoire: "Aléatoire pur",
  equilibre: "Équilibré (par classement)",
  mixte: "Mixte forcé (H/F)",
};

export function GenererForm({ tournamentId }: { tournamentId: string }) {
  const [state, formAction, isPending] = useActionState(genererEquipesAleatoires, null);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="tournamentId" value={tournamentId} />
      <Select name="strategie" defaultValue="aleatoire">
        <SelectTrigger className="w-full">
          <SelectValue>
            {(valeur: string) => LIBELLES_STRATEGIE[valeur] ?? valeur}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="aleatoire">Aléatoire pur</SelectItem>
          <SelectItem value="equilibre">Équilibré (par classement)</SelectItem>
          <SelectItem value="mixte">Mixte forcé (H/F)</SelectItem>
        </SelectContent>
      </Select>

      {state && "error" in state ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      {state && "success" in state ? (
        <p className="text-sm text-muted-foreground">
          {state.nbEquipes} équipe(s) créée(s).
          {state.joueursNonApparies > 0
            ? ` ${state.joueursNonApparies} joueur(s) resté(s) sans partenaire.`
            : ""}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Génération..." : "Générer les équipes aléatoires"}
      </Button>
    </form>
  );
}
