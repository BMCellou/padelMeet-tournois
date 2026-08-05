"use client";

import { useState, useTransition } from "react";
import { enregistrerScore, validerScore, corrigerScore, declarerForfait } from "./actions";
import type { MatchFormat } from "@/lib/engine/types";
import type { SetSaisi } from "@/lib/engine/score";
import { SetsForm } from "./SetsForm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export interface MatchAffiche {
  id: string;
  round: number;
  statut: string;
  teamAId: string;
  teamBId: string;
  teamANom: string;
  teamBNom: string;
  winnerId: string | null;
  sets: SetSaisi[];
}

const LIBELLES_STATUT: Record<string, string> = {
  a_venir: "À venir",
  pret: "Prêt",
  en_cours: "En cours",
  saisi: "Saisi",
  valide: "Validé",
  forfait: "Forfait",
};

function scoreResume(sets: SetSaisi[]): string {
  if (sets.length === 0) return "—";
  return sets
    .map((s) => {
      const tb = s.tiebreakA != null && s.tiebreakB != null ? `(${Math.min(s.tiebreakA, s.tiebreakB)})` : "";
      return `${s.jeuxA}-${s.jeuxB}${tb}`;
    })
    .join(", ");
}

export function MatchScoreCard({
  tournamentId,
  match,
  format,
}: {
  tournamentId: string;
  match: MatchAffiche;
  format: MatchFormat;
}) {
  const [dialogOuvert, setDialogOuvert] = useState<"score" | "forfait" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const modeCorrection = match.statut === "valide" || match.statut === "forfait";

  function soumettreSets(sets: SetSaisi[]) {
    startTransition(async () => {
      const action = modeCorrection ? corrigerScore : enregistrerScore;
      const resultat = await action(tournamentId, match.id, sets);
      if ("error" in resultat) {
        setError(resultat.error);
      } else {
        setError(null);
        setDialogOuvert(null);
      }
    });
  }

  function valider() {
    startTransition(async () => {
      const resultat = await validerScore(tournamentId, match.id);
      if ("error" in resultat) setError(resultat.error);
      else setError(null);
    });
  }

  function forfait(equipeGagnanteId: string) {
    startTransition(async () => {
      const resultat = await declarerForfait(tournamentId, match.id, equipeGagnanteId);
      if ("error" in resultat) setError(resultat.error);
      else {
        setError(null);
        setDialogOuvert(null);
      }
    });
  }

  const gagnantNom =
    match.statut === "forfait" && match.winnerId
      ? match.winnerId === match.teamAId
        ? match.teamANom
        : match.teamBNom
      : null;

  return (
    <div className="space-y-2 rounded-md border p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">Tour {match.round}</span>
        <Badge variant={match.statut === "valide" || match.statut === "forfait" ? "default" : "outline"}>
          {LIBELLES_STATUT[match.statut] ?? match.statut}
        </Badge>
      </div>
      <div className="flex items-center justify-between">
        <span className={match.winnerId === match.teamAId ? "font-medium" : undefined}>
          {match.teamANom}
        </span>
        <span className="text-muted-foreground">
          {match.statut === "forfait" ? `Forfait — ${gagnantNom}` : scoreResume(match.sets)}
        </span>
        <span className={match.winnerId === match.teamBId ? "font-medium" : undefined}>
          {match.teamBNom}
        </span>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap gap-2 pt-1">
        {match.statut === "saisi" ? (
          <Button size="sm" onClick={valider} disabled={isPending}>
            Valider
          </Button>
        ) : null}

        <Dialog
          open={dialogOuvert === "score"}
          onOpenChange={(o) => setDialogOuvert(o ? "score" : null)}
        >
          <DialogTrigger render={<Button size="sm" variant="outline" />}>
            {modeCorrection ? "Corriger" : match.statut === "saisi" ? "Modifier" : "Saisir le score"}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {match.teamANom} vs {match.teamBNom}
              </DialogTitle>
            </DialogHeader>
            <SetsForm
              format={format}
              initialSets={match.sets}
              onSubmit={soumettreSets}
              isPending={isPending}
              error={error}
              libelleSubmit={modeCorrection ? "Corriger" : "Enregistrer"}
            />
          </DialogContent>
        </Dialog>

        {match.statut !== "valide" ? (
          <Dialog
            open={dialogOuvert === "forfait"}
            onOpenChange={(o) => setDialogOuvert(o ? "forfait" : null)}
          >
            <DialogTrigger render={<Button size="sm" variant="ghost" className="text-muted-foreground" />}>
              Forfait
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Déclarer un forfait</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">Quelle équipe est déclarée gagnante ?</p>
              <div className="flex flex-col gap-2">
                <Button variant="outline" disabled={isPending} onClick={() => forfait(match.teamAId)}>
                  {match.teamANom} gagne
                </Button>
                <Button variant="outline" disabled={isPending} onClick={() => forfait(match.teamBId)}>
                  {match.teamBNom} gagne
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>
    </div>
  );
}
