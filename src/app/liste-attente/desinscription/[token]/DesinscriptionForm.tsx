"use client";

import { useState, useTransition } from "react";
import { seDesinscrire } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function DesinscriptionForm({ token }: { token: string }) {
  const [fait, setFait] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  if (fait) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>C&apos;est fait</CardTitle>
          <CardDescription>Tes informations ont été supprimées de la liste d&apos;attente. Tu ne recevras plus de message.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Se désinscrire de la liste d&apos;attente</CardTitle>
        <CardDescription>
          Tes informations (nom, e-mail, téléphone, niveau) seront supprimées définitivement et tu ne seras plus prévenu(e)
          des prochains tournois.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {erreur ? <p className="text-sm text-destructive">{erreur}</p> : null}
        <Button
          className="w-full"
          disabled={enCours}
          onClick={() =>
            demarrer(async () => {
              const r = await seDesinscrire(token);
              if ("error" in r) setErreur(r.error);
              else setFait(true);
            })
          }
        >
          {enCours ? "Suppression…" : "Me désinscrire et supprimer mes données"}
        </Button>
      </CardContent>
    </Card>
  );
}
