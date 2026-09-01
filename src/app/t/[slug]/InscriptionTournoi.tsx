"use client";

import { useActionState, useState } from "react";
import { sInscrireSolo, sInscrireEnPaire } from "./inscriptionActions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export function InscriptionNonConnecte({ slug }: { slug: string }) {
  const next = encodeURIComponent(`/t/${slug}`);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">S&apos;inscrire à ce tournoi</CardTitle>
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
          <Badge>Confirmée</Badge>
        )}
      </CardContent>
    </Card>
  );
}

export function InscriptionFormulaire({
  tournamentId,
  slug,
}: {
  tournamentId: string;
  slug: string;
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">S&apos;inscrire à ce tournoi</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 text-sm">
          <button
            type="button"
            className={mode === "paire" ? "font-medium underline" : "text-muted-foreground"}
            onClick={() => setMode("paire")}
          >
            En paire
          </button>
          <span className="text-muted-foreground">·</span>
          <button
            type="button"
            className={mode === "solo" ? "font-medium underline" : "text-muted-foreground"}
            onClick={() => setMode("solo")}
          >
            Seul(e), je serai apparié(e)
          </button>
        </div>

        {mode === "paire" ? (
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
            </div>
            {statePaire && "error" in statePaire ? (
              <p className="text-sm text-destructive">{statePaire.error}</p>
            ) : null}
            <Button type="submit" className="w-full" disabled={pendingPaire}>
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
            <Button type="submit" className="w-full" disabled={pendingSolo}>
              {pendingSolo ? "Inscription..." : "S'inscrire en solo"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
