"use client";

import { useActionState, useState } from "react";
import { connexion, demanderReinitialisation } from "./actions";
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

export default function LoginPage() {
  const [connexionState, connexionAction, connexionPending] = useActionState(
    connexion,
    null,
  );
  const [resetState, resetAction, resetPending] = useActionState(
    demanderReinitialisation,
    null,
  );
  const [modeReinitialisation, setModeReinitialisation] = useState(false);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Espace admin</CardTitle>
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
                    placeholder="admin@exemple.com"
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
            <form action={connexionAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="admin@exemple.com"
                />
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
              {connexionState && "error" in connexionState ? (
                <p className="text-sm text-destructive">{connexionState.error}</p>
              ) : null}
              <Button type="submit" className="w-full" disabled={connexionPending}>
                {connexionPending ? "Connexion..." : "Se connecter"}
              </Button>
              <button
                type="button"
                className="w-full text-center text-sm text-muted-foreground underline"
                onClick={() => setModeReinitialisation(true)}
              >
                Mot de passe oublié ?
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
