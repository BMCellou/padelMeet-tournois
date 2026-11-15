"use client";

import { useActionState } from "react";
import { sInscrireListeAttente } from "./actions";
import { NIVEAUX_LISTE_ATTENTE } from "@/lib/liste-attente/niveaux";
import { LIBELLE_CONSENTEMENT, type SectionRgpd } from "@/lib/liste-attente/rgpd";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ListeAttenteForm({ rgpd }: { rgpd: SectionRgpd[] }) {
  const [state, formAction, isPending] = useActionState(sInscrireListeAttente, null);

  if (state && "success" in state) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tu es sur la liste</CardTitle>
          <CardDescription>
            Merci ! On te prévient par e-mail, et au besoin par téléphone, dès que la date et le lieu du prochain
            tournoi sont connus.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
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
              <Label htmlFor="prenom">Prénom</Label>
              <Input id="prenom" name="prenom" required autoComplete="given-name" maxLength={60} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="nom">Nom</Label>
              <Input id="nom" name="nom" required autoComplete="family-name" maxLength={60} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" maxLength={160} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="telephone">Téléphone</Label>
            <Input
              id="telephone"
              name="telephone"
              type="tel"
              required
              autoComplete="tel"
              placeholder="06 12 34 56 78"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="niveau">Ton niveau</Label>
            <select
              id="niveau"
              name="niveau"
              required
              defaultValue=""
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
            >
              <option value="" disabled>
                Choisir…
              </option>
              {NIVEAUX_LISTE_ATTENTE.map((n) => (
                <option key={n.code} value={n.code}>
                  {n.libelle} : {n.aide}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="ville">
              Ville <span className="font-normal text-muted-foreground">(facultatif)</span>
            </Label>
            <Input id="ville" name="ville" autoComplete="address-level2" maxLength={80} />
            <p className="text-xs text-muted-foreground">
              Pour te prévenir en priorité si le tournoi a lieu près de chez toi. Tu peux la laisser vide.
            </p>
          </div>

          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="consentement" className="mt-1" required />
            <span>{LIBELLE_CONSENTEMENT}</span>
          </label>

          <details className="rounded-lg border bg-muted/30 p-3 text-sm">
            <summary className="cursor-pointer font-medium">Comment tes données sont utilisées</summary>
            <dl className="mt-3 space-y-2">
              {rgpd.map((s) => (
                <div key={s.titre}>
                  <dt className="font-medium">{s.titre}</dt>
                  <dd className="text-muted-foreground">{s.texte}</dd>
                </div>
              ))}
            </dl>
          </details>

          {state && "error" in state ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <Button type="submit" variant="volt" className="w-full" disabled={isPending}>
            {isPending ? "Inscription…" : "Rejoindre la liste d'attente"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
