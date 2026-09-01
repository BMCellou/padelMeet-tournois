"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { connexion } from "../actions";
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
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/compte";

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Mon espace joueur</CardTitle>
          <CardDescription>Connecte-toi avec ton e-mail et ton mot de passe.</CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
}
