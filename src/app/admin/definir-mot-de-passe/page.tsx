"use client";

import { useActionState } from "react";
import { definirMotDePasse } from "./actions";
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

export default function DefinirMotDePassePage() {
  const [state, formAction, isPending] = useActionState(definirMotDePasse, null);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Définir ton mot de passe</CardTitle>
          <CardDescription>
            Il sera utilisé pour toutes tes prochaines connexions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Nouveau mot de passe</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmation">Confirmation</Label>
              <Input
                id="confirmation"
                name="confirmation"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            {state && "error" in state ? (
              <p className="text-sm text-destructive">{state.error}</p>
            ) : null}
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Enregistrement..." : "Définir le mot de passe"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
