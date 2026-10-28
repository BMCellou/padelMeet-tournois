"use client";

import { useTransition } from "react";
import { refuserSolo, validerSolo } from "./actions";
import { Button } from "@/components/ui/button";

export interface SoloEnAttente {
  /** Identifiant de l'inscription (pas du joueur). */
  id: string;
  nomComplet: string;
}

/**
 * Joueurs seuls : ceux à valider (valider ou refuser) et ceux déjà validés qui attendent
 * l'appariement (retirer). Valider n'attribue aucune équipe.
 */
export function SolosEnAttenteList({
  tournamentId,
  aValider,
  valides,
}: {
  tournamentId: string;
  aValider: SoloEnAttente[];
  valides: SoloEnAttente[];
}) {
  const [enCours, demarrer] = useTransition();

  if (aValider.length === 0 && valides.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun joueur seul inscrit.</p>;
  }

  return (
    <div className="space-y-4">
      {aValider.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-sm font-medium">À valider ({aValider.length})</h3>
          <ul className="divide-y rounded-lg border">
            {aValider.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 p-3 text-sm">
                <span>{s.nomComplet}</span>
                <span className="flex shrink-0 gap-1">
                  <Button
                    size="sm"
                    disabled={enCours}
                    onClick={() => demarrer(() => validerSolo(s.id, tournamentId))}
                  >
                    Valider
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground"
                    disabled={enCours}
                    onClick={() => demarrer(() => refuserSolo(s.id, tournamentId))}
                  >
                    Refuser
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {valides.length > 0 ? (
        <section className="space-y-2">
          <h3 className="text-sm font-medium">Validés, en attente d&apos;un binôme ({valides.length})</h3>
          <ul className="divide-y rounded-lg border">
            {valides.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 p-3 text-sm">
                <span>{s.nomComplet}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0 text-muted-foreground"
                  disabled={enCours}
                  onClick={() => demarrer(() => refuserSolo(s.id, tournamentId))}
                >
                  Retirer
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
