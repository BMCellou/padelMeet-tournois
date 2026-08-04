"use client";

import { useState, useTransition } from "react";
import { modifierClub } from "./actions";
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

export function ClubEditDialog({
  clubId,
  nom,
  ville,
}: {
  clubId: string;
  nom: string;
  ville: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function envoyer(formData: FormData) {
    startTransition(async () => {
      const resultat = await modifierClub(null, formData);
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
          <DialogTitle>Modifier le club</DialogTitle>
        </DialogHeader>
        <form action={envoyer} className="space-y-3">
          <input type="hidden" name="clubId" value={clubId} />
          <div className="space-y-1">
            <Label htmlFor="club-nom">Nom du club</Label>
            <Input id="club-nom" name="nom" defaultValue={nom} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="club-ville">Ville</Label>
            <Input id="club-ville" name="ville" defaultValue={ville ?? ""} />
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
