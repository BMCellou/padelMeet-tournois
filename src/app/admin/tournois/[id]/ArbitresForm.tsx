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
        <Button type="submit" disabled={isPending} className="shrink-0">
          {isPending ? "Ajout..." : "Ajouter"}
        </Button>
      </form>
      {state && "error" in state ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state && "success" in state && state.motDePasseProvisoire ? (
        <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
          <p>
            Compte créé. Mot de passe provisoire (à transmettre en personne — il ne sera plus
            affiché ensuite) :
          </p>
          <code className="block rounded bg-background px-2 py-1 font-mono text-base tracking-wide">
            {state.motDePasseProvisoire}
          </code>
          <p className="text-xs text-muted-foreground">
            Un changement de mot de passe sera exigé à la première connexion.
          </p>
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Si cet e-mail a déjà un compte (participant, admin, ou scoreur d&apos;un autre tournoi),
        on ajoute juste le rôle à son compte existant, avec son mot de passe actuel — sinon un
        compte est créé avec un mot de passe provisoire à transmettre en personne.
      </p>
    </div>
  );
}
