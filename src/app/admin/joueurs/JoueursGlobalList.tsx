"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { supprimerJoueurOrphelin } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RemplacerJoueurDialog } from "./RemplacerJoueurDialog";

export interface AffectationEquipe {
  type: "equipe";
  teamId: string;
  tournamentId: string;
  tournamentNom: string;
  equipeNom: string;
}

export interface AffectationSolo {
  type: "solo";
  registrationId: string;
  tournamentId: string;
  tournamentNom: string;
  statut: string;
}

export type Affectation = AffectationEquipe | AffectationSolo;

export interface JoueurGlobal {
  id: string;
  nom: string;
  prenom: string;
  sexe: string | null;
  classementFft: string | null;
  telephone: string | null;
  email: string | null;
  aCompte: boolean;
  affectations: Affectation[];
}

function BoutonSupprimer({ playerId }: { playerId: string }) {
  const [confirme, setConfirme] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!confirme) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-destructive"
        onClick={() => setConfirme(true)}
      >
        Supprimer
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const resultat = await supprimerJoueurOrphelin(playerId);
              if ("error" in resultat) {
                setError(resultat.error);
                setConfirme(false);
              }
            })
          }
        >
          {isPending ? "Suppression..." : "Confirmer"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setConfirme(false)}>
          Annuler
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function JoueursGlobalList({ joueurs }: { joueurs: JoueurGlobal[] }) {
  const [recherche, setRecherche] = useState("");

  const joueursFiltres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return joueurs;
    return joueurs.filter((j) =>
      `${j.prenom} ${j.nom} ${j.email ?? ""}`.toLowerCase().includes(q),
    );
  }, [joueurs, recherche]);

  return (
    <div className="space-y-3">
      <Input
        placeholder="Rechercher un joueur..."
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
      />
      <ul className="divide-y rounded-lg border">
        {joueursFiltres.map((j) => {
          const nomComplet = `${j.prenom} ${j.nom}`;
          const aucunTournoi = j.affectations.length === 0;

          return (
            <li key={j.id} className="space-y-2 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{nomComplet}</p>
                  <p className="text-xs text-muted-foreground">
                    {j.email ?? "Pas d'e-mail"}
                    {j.classementFft ? ` · ${j.classementFft}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {j.aCompte ? (
                    <Badge variant="default">Compte</Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Sans compte
                    </Badge>
                  )}
                  {aucunTournoi ? (
                    <Badge variant="outline" className="text-muted-foreground">
                      Aucun tournoi
                    </Badge>
                  ) : null}
                </div>
              </div>

              {j.affectations.length > 0 ? (
                <ul className="space-y-1">
                  {j.affectations.map((a) =>
                    a.type === "equipe" ? (
                      <li
                        key={a.teamId}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/40 px-2 py-1"
                      >
                        <span>
                          {a.tournamentNom} — {a.equipeNom}
                        </span>
                        <RemplacerJoueurDialog
                          teamId={a.teamId}
                          tournamentId={a.tournamentId}
                          tournamentNom={a.tournamentNom}
                          equipeNom={a.equipeNom}
                          ancienPlayerId={j.id}
                          ancienNomComplet={nomComplet}
                        />
                      </li>
                    ) : (
                      <li
                        key={a.registrationId}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/40 px-2 py-1"
                      >
                        <span>
                          {a.tournamentNom} — Solo
                          {a.statut === "en_attente" ? " (en attente d'appariement)" : ""}
                        </span>
                      </li>
                    ),
                  )}
                </ul>
              ) : j.aCompte ? (
                <p className="text-xs text-muted-foreground">
                  A un compte mais aucun tournoi —{" "}
                  <Link href="/admin/utilisateurs" className="underline">
                    gérer la désactivation depuis Utilisateurs
                  </Link>
                  .
                </p>
              ) : (
                <div className="flex justify-end">
                  <BoutonSupprimer playerId={j.id} />
                </div>
              )}
            </li>
          );
        })}
        {joueursFiltres.length === 0 ? (
          <li className="p-3 text-sm text-muted-foreground">Aucun résultat.</li>
        ) : null}
      </ul>
    </div>
  );
}
