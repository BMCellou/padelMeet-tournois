"use client";

import { useState, useTransition } from "react";
import { lancerBackupManuel } from "./actions";
import { Button } from "@/components/ui/button";
import type { BackupListee } from "@/lib/backup/service";

function formaterDate(iso: string): string {
  if (!iso) return "?";
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function formaterTaille(octets: number): string {
  return octets < 1024 * 1024 ? `${(octets / 1024).toFixed(0)} Ko` : `${(octets / 1024 / 1024).toFixed(1)} Mo`;
}

export function BackupPanel({ backups }: { backups: BackupListee[] }) {
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function lancer() {
    setMessage(null);
    startTransition(async () => {
      const r = await lancerBackupManuel();
      setMessage("error" in r ? { ok: false, texte: r.error } : { ok: true, texte: r.message });
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button type="button" onClick={lancer} disabled={isPending}>
          {isPending ? "Sauvegarde en cours..." : "Sauvegarder maintenant"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Automatique chaque nuit à 3h (Europe/Paris, décalé selon l&apos;heure d&apos;été) ; les 14 plus
          récentes sont gardées.
        </p>
      </div>
      {message ? (
        <p className={message.ok ? "text-sm text-primary" : "text-sm text-destructive"}>{message.texte}</p>
      ) : null}

      {backups.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune sauvegarde pour l&apos;instant.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {backups.map((b) => (
            <li key={b.chemin} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <span>
                {formaterDate(b.creeLe)}{" "}
                <span className="text-muted-foreground">· {formaterTaille(b.tailleOctets)}</span>
              </span>
              {b.urlSignee ? (
                <a href={b.urlSignee} className="text-primary hover:underline" download>
                  Télécharger
                </a>
              ) : (
                <span className="text-xs text-muted-foreground">Lien indisponible</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
