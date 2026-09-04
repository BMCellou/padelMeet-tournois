"use client";

import { useState, useTransition } from "react";
import { modifierProfilUtilisateur } from "./actions";
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

export interface ProfilEditable {
  id: string;
  nom: string;
  prenom: string;
  sexe: string | null;
  classementFft: string | null;
  telephone: string | null;
}

export function ModifierProfilUtilisateurDialog({ profil }: { profil: ProfilEditable }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function envoyer(formData: FormData) {
    startTransition(async () => {
      const resultat = await modifierProfilUtilisateur(null, formData);
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
            Modifier {profil.prenom} {profil.nom}
          </DialogTitle>
        </DialogHeader>
        <form action={envoyer} className="space-y-3">
          <input type="hidden" name="playerId" value={profil.id} />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="up-prenom">Prénom</Label>
              <Input id="up-prenom" name="prenom" defaultValue={profil.prenom} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="up-nom">Nom</Label>
              <Input id="up-nom" name="nom" defaultValue={profil.nom} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="up-sexe">Sexe (H/F)</Label>
              <Input id="up-sexe" name="sexe" maxLength={1} defaultValue={profil.sexe ?? ""} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="up-classement">Classement</Label>
              <Input
                id="up-classement"
                name="classementFft"
                placeholder="15/1"
                defaultValue={profil.classementFft ?? ""}
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label htmlFor="up-telephone">Téléphone</Label>
              <Input id="up-telephone" name="telephone" defaultValue={profil.telephone ?? ""} />
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
