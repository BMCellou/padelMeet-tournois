"use client";

import { useState, useTransition } from "react";
import { basculerActivation } from "./actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ModifierProfilUtilisateurDialog, type ProfilEditable } from "./ModifierProfilUtilisateurDialog";
import { GererRolesDialog, type RoleAffiche } from "./GererRolesDialog";

export interface UtilisateurAffiche {
  userId: string;
  email: string;
  actif: boolean;
  player: ProfilEditable | null;
  roles: RoleAffiche[];
}

interface Tournoi {
  id: string;
  nom: string;
}

function BoutonActivation({ userId, actif }: { userId: string; actif: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        className={actif ? "text-destructive" : "text-primary"}
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const resultat = await basculerActivation(userId, !actif);
            setError("error" in resultat ? resultat.error : null);
          })
        }
      >
        {isPending ? "..." : actif ? "Désactiver" : "Réactiver"}
      </Button>
      {error ? <p className="max-w-40 text-right text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function UtilisateursList({
  utilisateurs,
  tournois,
}: {
  utilisateurs: UtilisateurAffiche[];
  tournois: Tournoi[];
}) {
  if (utilisateurs.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun utilisateur pour l&apos;instant.</p>;
  }

  return (
    <ul className="divide-y rounded-lg border">
      {utilisateurs.map((u) => {
        const nomAffiche = u.player ? `${u.player.prenom} ${u.player.nom}` : u.email;
        return (
          <li key={u.userId} className="space-y-2 p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium">
                  {nomAffiche}
                  {!u.actif ? (
                    <span className="ml-2 text-xs font-normal text-destructive">désactivé</span>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground">{u.email}</p>
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {u.roles.length === 0 ? (
                  <Badge variant="outline" className="text-muted-foreground">
                    Participant
                  </Badge>
                ) : (
                  u.roles.map((r) => (
                    <Badge key={r.membershipId} variant={r.role === "admin" ? "default" : "outline"}>
                      {r.role === "admin" ? "Admin" : `Scoreur · ${r.tournamentNom}`}
                    </Badge>
                  ))
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {u.player ? <ModifierProfilUtilisateurDialog profil={u.player} /> : null}
              <GererRolesDialog
                userId={u.userId}
                nomAffiche={nomAffiche}
                roles={u.roles}
                tournois={tournois}
              />
              <BoutonActivation userId={u.userId} actif={u.actif} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
