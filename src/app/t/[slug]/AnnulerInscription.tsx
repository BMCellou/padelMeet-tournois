"use client";

import { useState, useTransition } from "react";
import { annulerMonInscription } from "./annulationActions";
import { Button } from "@/components/ui/button";

/**
 * Annulation en deux temps (pas d'annulation par erreur d'un seul clic). `limite` est déjà
 * formatée côté serveur ; `message` explique pourquoi l'annulation n'est plus possible.
 */
export function AnnulerInscription({
  tournamentId,
  slug,
  limite,
  message,
}: {
  tournamentId: string;
  slug: string;
  /** Renseigné quand l'annulation est possible : « samedi 10 octobre à 09:00 ». */
  limite?: string;
  /** Renseigné quand elle ne l'est plus. */
  message?: string;
}) {
  const [confirmer, setConfirmer] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState(false);
  const [enCours, demarrer] = useTransition();

  if (fait) return <p className="text-sm text-muted-foreground">Ton inscription est annulée.</p>;

  if (!limite) {
    return message ? <p className="text-xs text-muted-foreground">{message}</p> : null;
  }

  if (!confirmer) {
    return (
      <div className="space-y-1">
        <Button type="button" variant="outline" size="sm" onClick={() => setConfirmer(true)}>
          Annuler mon inscription
        </Button>
        <p className="text-xs text-muted-foreground">Annulation possible jusqu&apos;au {limite}.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
      <p>
        Annuler ton inscription ? Si tu es inscrit(e) en paire, l&apos;inscription est annulée pour vous deux
        et ton/ta partenaire est prévenu(e) par e-mail.
      </p>
      {erreur ? <p className="text-destructive">{erreur}</p> : null}
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={enCours}
          onClick={() =>
            demarrer(async () => {
              const r = await annulerMonInscription(tournamentId, slug);
              if ("error" in r) setErreur(r.error);
              else setFait(true);
            })
          }
        >
          {enCours ? "Annulation…" : "Oui, annuler"}
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={enCours} onClick={() => setConfirmer(false)}>
          Garder mon inscription
        </Button>
      </div>
    </div>
  );
}
