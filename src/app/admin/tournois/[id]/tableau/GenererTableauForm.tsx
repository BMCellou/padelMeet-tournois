"use client";

import { useState, useTransition } from "react";
import { genererTableauFinal } from "./actions";
import { Button } from "@/components/ui/button";

export function GenererTableauForm({ tournamentId }: { tournamentId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function generer() {
    startTransition(async () => {
      const resultat = await genererTableauFinal(tournamentId);
      if ("error" in resultat) setError(resultat.error);
      else setError(null);
    });
  }

  return (
    <div className="space-y-2">
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button onClick={generer} disabled={isPending}>
        {isPending ? "Génération..." : "Générer le tableau final"}
      </Button>
    </div>
  );
}
