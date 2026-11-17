"use client";

import { useActionState } from "react";
import { sInscrireListeAttente } from "./actions";
import Link from "next/link";
import type { SectionRgpd } from "@/lib/liste-attente/rgpd";
import { BlocConsentement, ChampNiveau, ChampVille } from "./ChampsCommuns";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LegendeObligatoire, Obligatoire } from "@/components/Obligatoire";

export function ListeAttenteForm({ rgpd }: { rgpd: SectionRgpd[] }) {
  const [state, formAction, isPending] = useActionState(sInscrireListeAttente, null);
  // Après une erreur, on remet ce que la personne avait saisi : React vide le formulaire à chaque envoi.
  const v = state && "error" in state ? state.valeurs : undefined;

  if (state && "success" in state) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tu es sur la liste</CardTitle>
          <CardDescription>
            Merci ! On te prévient par e-mail, et au besoin par téléphone, dès que la date et le lieu du prochain
            tournoi sont connus. Un e-mail de confirmation vient de t&apos;être envoyé : s&apos;il n&apos;arrive pas,
            regarde dans tes courriers indésirables.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm font-medium">Gagne du temps le jour de l&apos;annonce</p>
          <p className="text-sm text-muted-foreground">
            Pour t&apos;inscrire à un tournoi, il faut un compte. Crée-le dès maintenant : le jour J, tu n&apos;auras
            plus qu&apos;à cliquer sur le lien.
          </p>
          <Link href="/compte/inscription?next=/liste-attente" className={`${buttonVariants({ variant: "volt" })} w-full`}>
            Créer mon compte
          </Link>
          <p className="text-center text-xs text-muted-foreground">
            Déjà un compte ?{" "}
            <Link href="/compte/connexion?next=/liste-attente" className="underline">
              Connecte-toi
            </Link>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-center text-sm text-muted-foreground">
        Tu as déjà un compte ?{" "}
        <Link href="/compte/connexion?next=/liste-attente" className="underline">
          Connecte-toi
        </Link>{" "}
        pour t&apos;inscrire en un clic.
      </p>
      <Card>
        <CardHeader>
          <CardTitle>Liste d&apos;attente du prochain tournoi</CardTitle>
          <CardDescription>
            Laisse tes coordonnées : on te prévient dès que la date et le lieu sont fixés, avant l&apos;ouverture des
            inscriptions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            {/* Champ piège pour les robots : invisible, jamais rempli par une personne. */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label htmlFor="site">Ne pas remplir</label>
              <input id="site" name="site" type="text" tabIndex={-1} autoComplete="off" />
            </div>
  
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="prenom">
                Prénom <Obligatoire />
              </Label>
                <Input id="prenom" name="prenom" required autoComplete="given-name" maxLength={60} defaultValue={v?.prenom} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="nom">
                Nom <Obligatoire />
              </Label>
                <Input id="nom" name="nom" required autoComplete="family-name" maxLength={60} defaultValue={v?.nom} />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">
              E-mail <Obligatoire />
            </Label>
              <Input id="email" name="email" type="email" required autoComplete="email" maxLength={160} defaultValue={v?.email} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="telephone">
              Téléphone <Obligatoire />
            </Label>
              <Input
                id="telephone"
                name="telephone"
                type="tel"
                required
                autoComplete="tel"
                placeholder="06 12 34 56 78"
                defaultValue={v?.telephone}
              />
            </div>
            <ChampNiveau valeur={v?.niveau} />
            <ChampVille valeur={v?.ville} />
            <BlocConsentement rgpd={rgpd} coche={v?.consentement === "on"} />
  
            <LegendeObligatoire />
            {state && "error" in state ? <p className="text-sm text-destructive">{state.error}</p> : null}
            <Button type="submit" variant="volt" className="w-full" disabled={isPending}>
              {isPending ? "Inscription…" : "Rejoindre la liste d'attente"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
