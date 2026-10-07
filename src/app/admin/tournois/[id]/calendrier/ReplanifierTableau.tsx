"use client";

import { useState, useTransition } from "react";
import { replanifierTableau } from "./actions";
import { Button } from "@/components/ui/button";

export function ReplanifierTableau({
  tournamentId,
  verrouille,
}: {
  tournamentId: string;
  verrouille: boolean;
}) {
  const [confirmation, setConfirmation] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function lancer() {
    setMessage(null);
    startTransition(async () => {
      const r = await replanifierTableau(tournamentId);
      setConfirmation(false);
      setMessage("error" in r ? { ok: false, texte: r.error } : { ok: true, texte: "Phase finale replanifiée." });
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Les matchs du tableau (quarts, demies, finale, 3e et 5e place) sont placés à la suite des poules, même
        quand leurs équipes ne sont pas encore connues : glisse-les dans la grille ci-dessus pour les ajuster.
      </p>
      {verrouille ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-sm">
          🔒 Un match du tableau est déjà validé : le calendrier de la phase finale ne peut plus changer.
        </p>
      ) : confirmation ? (
        <div className="flex items-center gap-2">
          <Button type="button" variant="destructive" size="sm" disabled={isPending} onClick={lancer}>
            {isPending ? "Replanification..." : "Confirmer : effacer mes ajustements"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmation(false)}>
            Annuler
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => setConfirmation(true)}>
          Replanifier le tableau final
        </Button>
      )}
      {message ? (
        <p className={message.ok ? "text-sm text-primary" : "text-sm text-destructive"}>{message.texte}</p>
      ) : null}
    </div>
  );
}
