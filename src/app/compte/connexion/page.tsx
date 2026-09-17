"use client";

import { Suspense, useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { connexion, demanderReinitialisation } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default function ConnexionParticipantPage() {
  return (
    <Suspense fallback={null}>
      <FormulaireConnexion />
    </Suspense>
  );
}

function FormulaireConnexion() {
  const [state, formAction, isPending] = useActionState(connexion, null);
  const [resetState, resetAction, resetPending] = useActionState(demanderReinitialisation, null);
  const [modeReinitialisation, setModeReinitialisation] = useState(false);
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/compte";

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Mon espace joueur</CardTitle>
          <CardDescription>
            {modeReinitialisation
              ? "Reçois un lien pour définir un nouveau mot de passe."
              : "Connecte-toi avec ton e-mail et ton mot de passe."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {modeReinitialisation ? (
            resetState && "success" in resetState ? (
              <p className="text-sm text-muted-foreground">
                Lien envoyé. Vérifie ta boîte mail.
              </p>
            ) : (
              <form action={resetAction} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">E-mail</Label>
                  <Input
                    id="reset-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                  />
                </div>
                {resetState && "error" in resetState ? (
                  <p className="text-sm text-destructive">{resetState.error}</p>
                ) : null}
                <Button type="submit" className="w-full" disabled={resetPending}>
                  {resetPending ? "Envoi..." : "Recevoir le lien"}
                </Button>
                <button
                  type="button"
                  className="w-full text-center text-sm text-muted-foreground underline"
                  onClick={() => setModeReinitialisation(false)}
                >
                  Retour à la connexion
                </button>
              </form>
            )
          ) : (
            <form action={formAction} className="space-y-4">
              <input type="hidden" name="next" value={next} />
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" required autoComplete="email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                />
              </div>
              {state && "error" in state ? (
                <p className="text-sm text-destructive">{state.error}</p>
              ) : null}
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Connexion..." : "Se connecter"}
              </Button>
              <button
                type="button"
                className="w-full text-center text-sm text-muted-foreground underline"
                onClick={() => setModeReinitialisation(true)}
              >
                Mot de passe oublié ?
              </button>
              <p className="text-center text-sm text-muted-foreground">
                Pas encore de compte ?{" "}
                <Link
                  href={`/compte/inscription?next=${encodeURIComponent(next)}`}
                  className="underline"
                >
                  Créer un compte
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
