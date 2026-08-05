"use client";

import { useActionState } from "react";
import { creerClub } from "./actions";
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

export function ClubForm() {
  const [state, formAction, isPending] = useActionState(creerClub, null);

  return (
    <Card className="mx-auto max-w-sm">
      <CardHeader>
        <CardTitle>Créer un club</CardTitle>
        <CardDescription>Tu pourras y rattacher des tournois.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom du club</Label>
            <Input id="nom" name="nom" required placeholder="Padel Club des Lilas" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ville">Ville</Label>
            <Input id="ville" name="ville" placeholder="Paris" />
          </div>
          {state && "error" in state ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : null}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Création..." : "Créer le club"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
