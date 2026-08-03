"use client";

import { useActionState } from "react";
import { requestMagicLink } from "./actions";
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
  const [state, formAction, isPending] = useActionState(requestMagicLink, null);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Espace admin</CardTitle>
          <CardDescription>
            Reçois un lien de connexion par e-mail.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {state && "success" in state ? (
            <p className="text-sm text-muted-foreground">
              Lien envoyé. Vérifie ta boîte mail.
            </p>
          ) : (
            <form action={formAction} className="space-y-4">
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
              {state && "error" in state ? (
                <p className="text-sm text-destructive">{state.error}</p>
              ) : null}
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Envoi..." : "Recevoir le lien"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
