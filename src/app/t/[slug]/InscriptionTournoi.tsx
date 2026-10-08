"use client";

import { useActionState, useState } from "react";
import { sInscrireSolo, sInscrireEnPaire } from "./inscriptionActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export function BadgePlaces({ libelle, complet }: { libelle: string | null; complet: boolean }) {
  if (!libelle) return null;
  return (
    <Badge variant={complet ? "outline" : "volt"} className={complet ? "text-destructive" : undefined}>
      {libelle}
    </Badge>
  );
}

export function InscriptionNonConnecte({
  slug,
  placesLibelle,
  complet,
}: {
  slug: string;
  placesLibelle: string | null;
  complet: boolean;
}) {
  const next = encodeURIComponent(`/t/${slug}`);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          S&apos;inscrire à ce tournoi
          <BadgePlaces libelle={placesLibelle} complet={complet} />
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 sm:flex-row">
        <Link href={`/compte/connexion?next=${next}`} className="flex-1">
          <Button variant="outline" className="w-full">
            Se connecter
          </Button>
        </Link>
        <Link href={`/compte/inscription?next=${next}`} className="flex-1">
          <Button className="w-full">Créer un compte</Button>
        </Link>
      </CardContent>
    </Card>
  );
}

export function InscriptionDejaFaite({
  libelle,
  enAttente,
}: {
  libelle: string;
  enAttente: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ton inscription</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm">{libelle}</p>
        {enAttente ? (
          <Badge variant="outline" className="text-muted-foreground">
            En attente de validation par le club
          </Badge>
        ) : (
          <Badge variant="volt">Confirmée</Badge>
        )}
      </CardContent>
    </Card>
  );
}

export function InscriptionFormulaire({
  tournamentId,
  slug,
  placesLibelle,
  placesRestantes,
}: {
  tournamentId: string;
  slug: string;
  placesLibelle: string | null;
  /** null = illimité */
  placesRestantes: number | null;
}) {
  const [mode, setMode] = useState<"solo" | "paire">("paire");
  const [stateSolo, actionSolo, pendingSolo] = useActionState(sInscrireSolo, null);
  const [statePaire, actionPaire, pendingPaire] = useActionState(sInscrireEnPaire, null);

  const succes =
    (stateSolo && "success" in stateSolo) || (statePaire && "success" in statePaire);

  if (succes) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inscription envoyée</CardTitle>
        </CardHeader>
        <CardContent>
          <Badge variant="outline" className="text-muted-foreground">
            En attente de validation par le club
          </Badge>
        </CardContent>
      </Card>
    );
  }

  const complet = placesRestantes === 0;
  const uneSeulePlace = placesRestantes === 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          S&apos;inscrire à ce tournoi
          <BadgePlaces libelle={placesLibelle} complet={complet} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {complet ? (
          <p className="text-sm text-muted-foreground">
            Ce tournoi est complet, les inscriptions sont fermées.
          </p>
        ) : null}
        {uneSeulePlace ? (
          <p className="text-sm text-muted-foreground">
            Il ne reste qu&apos;une place : seule l&apos;inscription en solo est possible.
          </p>
        ) : null}
        <div className={complet || uneSeulePlace ? "hidden" : "space-y-2"}>
          <p className="text-sm font-medium">Comment veux-tu t&apos;inscrire ?</p>
          <div role="radiogroup" aria-label="Mode d'inscription" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
            {(
              [
                { id: "paire", libelle: "En paire", aide: "Tu viens avec un partenaire" },
                { id: "solo", libelle: "Seul(e)", aide: "Le club t'associe à un joueur" },
              ] as const
            ).map((o) => (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={mode === o.id}
                onClick={() => setMode(o.id)}
                className={
                  mode === o.id
                    ? "rounded-md bg-primary px-3 py-2 text-left text-primary-foreground shadow-sm"
                    : "rounded-md px-3 py-2 text-left text-muted-foreground hover:bg-background/60"
                }
              >
                <span className="block text-sm font-semibold">{o.libelle}</span>
                <span className="block text-xs opacity-80">{o.aide}</span>
              </button>
            ))}
          </div>
        </div>

        {complet ? null : mode === "paire" && !uneSeulePlace ? (
          <form action={actionPaire} className="space-y-3">
            <input type="hidden" name="tournamentId" value={tournamentId} />
            <input type="hidden" name="slug" value={slug} />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="prenomPartenaire">Prénom du/de la partenaire</Label>
                <Input id="prenomPartenaire" name="prenomPartenaire" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="nomPartenaire">Nom du/de la partenaire</Label>
                <Input id="nomPartenaire" name="nomPartenaire" required />
              </div>
              <div className="col-span-2 space-y-1">
                <Label htmlFor="emailPartenaire">E-mail du/de la partenaire</Label>
                <Input id="emailPartenaire" name="emailPartenaire" type="email" required />
                <p className="text-xs text-muted-foreground">
                  S&apos;il/elle a déjà un compte, ça relie directement son profil — son historique
                  verra ce tournoi. Sinon, pas de souci : indique quand même son e-mail, on
                  l&apos;enregistre pour plus tard.
                </p>
              </div>
            </div>
            {statePaire && "error" in statePaire ? (
              <p className="text-sm text-destructive">{statePaire.error}</p>
            ) : null}
            <Button type="submit" variant="volt" className="w-full" disabled={pendingPaire}>
              {pendingPaire ? "Inscription..." : "S'inscrire en paire"}
            </Button>
          </form>
        ) : (
          <form action={actionSolo} className="space-y-3">
            <input type="hidden" name="tournamentId" value={tournamentId} />
            <input type="hidden" name="slug" value={slug} />
            <p className="text-sm text-muted-foreground">
              Le club t&apos;associera à un autre joueur seul.
            </p>
            {stateSolo && "error" in stateSolo ? (
              <p className="text-sm text-destructive">{stateSolo.error}</p>
            ) : null}
            <Button type="submit" variant="volt" className="w-full" disabled={pendingSolo}>
              {pendingSolo ? "Inscription..." : "S'inscrire en solo"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
