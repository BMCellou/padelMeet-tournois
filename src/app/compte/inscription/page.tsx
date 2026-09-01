"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { inscription } from "../actions";
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

export default function InscriptionParticipantPage() {
  return (
    <Suspense fallback={null}>
      <FormulaireInscription />
    </Suspense>
  );
}

function FormulaireInscription() {
  const [state, formAction, isPending] = useActionState(inscription, null);
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/compte";

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Créer mon compte joueur</CardTitle>
          <CardDescription>
            Pour t&apos;inscrire aux tournois et retrouver ton historique.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="next" value={next} />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="prenom">Prénom</Label>
                <Input id="prenom" name="prenom" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="nom">Nom</Label>
                <Input id="nom" name="nom" required />
              </div>
              <div className="col-span-2 space-y-1">
                <Label htmlFor="sexe">Sexe (H/F)</Label>
                <Input id="sexe" name="sexe" maxLength={1} placeholder="H" className="max-w-24" />
              </div>
              <div className="col-span-2 space-y-1">
                <Label htmlFor="telephone">Téléphone</Label>
                <Input id="telephone" name="telephone" />
              </div>
            </div>
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
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            {state && "error" in state ? (
              <p className="text-sm text-destructive">{state.error}</p>
            ) : null}
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Création..." : "Créer mon compte"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Déjà un compte ?{" "}
              <Link
                href={`/compte/connexion?next=${encodeURIComponent(next)}`}
                className="underline"
              >
                Se connecter
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
