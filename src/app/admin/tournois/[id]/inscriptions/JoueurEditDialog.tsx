"use client";

import { useState, useTransition } from "react";
import { modifierJoueur } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export interface JoueurEditable {
  id: string;
  nom: string;
  prenom: string;
  sexe: string | null;
  classementFft: string | null;
  telephone: string | null;
  email: string | null;
}

export function JoueurEditDialog({
  tournamentId,
  joueur,
}: {
  tournamentId: string;
  joueur: JoueurEditable;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function envoyer(formData: FormData) {
    startTransition(async () => {
      const resultat = await modifierJoueur(null, formData);
      if ("error" in resultat) {
        setError(resultat.error);
      } else {
        setError(null);
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm" />}>Modifier</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Modifier {joueur.prenom} {joueur.nom}
          </DialogTitle>
        </DialogHeader>
        <form action={envoyer} className="space-y-3">
          <input type="hidden" name="playerId" value={joueur.id} />
          <input type="hidden" name="tournamentId" value={tournamentId} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor={`prenom-${joueur.id}`}>Prénom</Label>
              <Input
                id={`prenom-${joueur.id}`}
                name="prenom"
                defaultValue={joueur.prenom}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`nom-${joueur.id}`}>Nom</Label>
              <Input id={`nom-${joueur.id}`} name="nom" defaultValue={joueur.nom} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`sexe-${joueur.id}`}>Sexe (H/F)</Label>
              <Input
                id={`sexe-${joueur.id}`}
                name="sexe"
                maxLength={1}
                defaultValue={joueur.sexe ?? ""}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`classement-${joueur.id}`}>Classement</Label>
              <Input
                id={`classement-${joueur.id}`}
                name="classementFft"
                defaultValue={joueur.classementFft ?? ""}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`telephone-${joueur.id}`}>Téléphone</Label>
              <Input
                id={`telephone-${joueur.id}`}
                name="telephone"
                defaultValue={joueur.telephone ?? ""}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`email-${joueur.id}`}>E-mail</Label>
              <Input
                id={`email-${joueur.id}`}
                name="email"
                type="email"
                defaultValue={joueur.email ?? ""}
              />
            </div>
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
