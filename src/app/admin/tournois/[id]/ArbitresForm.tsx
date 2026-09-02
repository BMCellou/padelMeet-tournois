"use client";

import { useActionState } from "react";
import { inviterScoreur, retirerScoreur } from "./arbitresActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface ScoreurAffiche {
  membershipId: string;
  email: string;
}

export function ArbitresForm({
  tournamentId,
  scoreurs,
}: {
  tournamentId: string;
  scoreurs: ScoreurAffiche[];
}) {
  const [state, formAction, isPending] = useActionState(inviterScoreur, null);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Un·e scoreur·se peut saisir et valider les scores de ce tournoi, sans accès
        au reste de l&apos;administration.
      </p>

      {scoreurs.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun·e scoreur·se pour l&apos;instant.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {scoreurs.map((s) => (
            <li key={s.membershipId} className="flex items-center justify-between gap-2 p-3 text-sm">
              <span>{s.email}</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => retirerScoreur(s.membershipId, tournamentId)}
              >
                Retirer
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="flex flex-col gap-2 sm:flex-row">
        <input type="hidden" name="tournamentId" value={tournamentId} />
        <Input name="email" type="email" placeholder="scoreur@exemple.com" required className="flex-1" />
        <Input
          name="password"
          type="text"
          placeholder="Mot de passe initial"
          required
          minLength={8}
          className="flex-1"
        />
        <Button type="submit" disabled={isPending} className="shrink-0">
          {isPending ? "Invitation..." : "Ajouter"}
        </Button>
      </form>
      {state && "error" in state ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <p className="text-xs text-muted-foreground">
        Transmets ces identifiants au/à la scoreur·se toi-même (rien n&apos;est envoyé par e-mail) —
        connexion sur le même écran que l&apos;admin.
      </p>
    </div>
  );
}
