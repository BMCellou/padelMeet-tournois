"use client";

import { useState, useTransition } from "react";
import { regenererTableauAvecQualifies } from "./actions";
import { Button } from "@/components/ui/button";
import type { EquipePoule } from "@/lib/tournoi/tableauFinal";

export function QualifiesEditor({
  tournamentId,
  tailleTableau,
  avertissement,
  equipes,
  dejaGenere,
}: {
  tournamentId: string;
  tailleTableau: number;
  avertissement?: string;
  equipes: EquipePoule[];
  dejaGenere: boolean;
}) {
  const [selection, setSelection] = useState<Set<string>>(
    () => new Set(equipes.filter((e) => e.qualifieAuto).map((e) => e.teamId)),
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [ouvert, setOuvert] = useState(!dejaGenere);

  function toggle(teamId: string) {
    setSelection((s) => {
      const copy = new Set(s);
      if (copy.has(teamId)) copy.delete(teamId);
      else copy.add(teamId);
      return copy;
    });
  }

  function regenerer() {
    setError(null);
    startTransition(async () => {
      const resultat = await regenererTableauAvecQualifies(tournamentId, [...selection]);
      if ("error" in resultat) setError(resultat.error);
    });
  }

  const parGroupe = new Map<string, EquipePoule[]>();
  for (const e of equipes) {
    const liste = parGroupe.get(e.groupNom) ?? [];
    liste.push(e);
    parGroupe.set(e.groupNom, liste);
  }

  const compte = selection.size;
  const pret = compte === tailleTableau;

  if (!ouvert) {
    return (
      <div className="rounded-lg border p-3 text-sm">
        <div className="flex items-center justify-between gap-2">
          <p className="text-muted-foreground">
            Tableau généré automatiquement dès la fin des poules ({tailleTableau} qualifiés).
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => setOuvert(true)}>
            Modifier les qualifiés
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">
          Qualifiés ({compte} / {tailleTableau})
        </p>
        {dejaGenere ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => setOuvert(false)}>
            Fermer
          </Button>
        ) : null}
      </div>
      {avertissement ? <p className="text-sm text-destructive">{avertissement}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        {[...parGroupe.entries()].map(([groupNom, liste]) => (
          <div key={groupNom} className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Poule {groupNom}</p>
            <ul className="divide-y rounded-md border">
              {liste.map((e) => (
                <li key={e.teamId} className="flex items-center gap-2 p-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selection.has(e.teamId)}
                    onChange={() => toggle(e.teamId)}
                    id={`qual-${e.teamId}`}
                    className="size-4"
                  />
                  <label htmlFor={`qual-${e.teamId}`} className="flex-1 cursor-pointer">
                    {e.rang ? `${e.rang}. ` : ""}
                    {e.equipeNom}
                  </label>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="button" onClick={regenerer} disabled={!pret || isPending}>
        {isPending
          ? "Génération..."
          : dejaGenere
            ? "Régénérer le tableau avec cette sélection"
            : "Générer le tableau"}
      </Button>
      {!pret ? (
        <p className="text-xs text-muted-foreground">
          Sélectionne exactement {tailleTableau} équipes pour générer le tableau.
        </p>
      ) : null}
    </div>
  );
}
