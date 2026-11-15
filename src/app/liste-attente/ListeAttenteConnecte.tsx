"use client";

import { useActionState } from "react";
import { sInscrireListeAttenteConnecte } from "./actions";
import type { SectionRgpd } from "@/lib/liste-attente/rgpd";
import { BlocConsentement, ChampNiveau, ChampVille } from "./ChampsCommuns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ListeAttenteConnecte({
  prenom,
  nom,
  email,
  telephone,
  rgpd,
}: {
  prenom: string;
  nom: string;
  email: string;
  /** null : le profil n'a pas encore de numéro, on le demande. */
  telephone: string | null;
  rgpd: SectionRgpd[];
}) {
  const [state, formAction, isPending] = useActionState(sInscrireListeAttenteConnecte, null);

  if (state && "success" in state) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tu es sur la liste</CardTitle>
          <CardDescription>
            Merci {prenom} ! On te prévient dès que la date et le lieu du prochain tournoi sont connus. Ton compte est
            prêt : le jour J, tu n&apos;auras plus qu&apos;à t&apos;inscrire depuis le lien reçu.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Me prévenir du prochain tournoi</CardTitle>
        <CardDescription>
          Connecté(e) en tant que {prenom} {nom} ({email}). On reprend les informations de ton profil : il ne reste
          que ton niveau et ton accord.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {telephone === null ? (
            <div className="space-y-1">
              <Label htmlFor="telephone">Téléphone</Label>
              <Input id="telephone" name="telephone" type="tel" required autoComplete="tel" placeholder="06 12 34 56 78" />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Téléphone : {telephone}</p>
          )}
          <ChampNiveau />
          <ChampVille />
          <BlocConsentement rgpd={rgpd} />
          {state && "error" in state ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <Button type="submit" variant="volt" className="w-full" disabled={isPending}>
            {isPending ? "Inscription…" : "Me prévenir"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
