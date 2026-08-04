"use client";

import { useState, useTransition } from "react";
import { supprimerTournoi } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function SupprimerTournoiDialog({
  tournamentId,
  tournamentNom,
}: {
  tournamentId: string;
  tournamentNom: string;
}) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [isPending, startTransition] = useTransition();

  const confirmationValide = confirmation.trim() === tournamentNom;

  function supprimer() {
    startTransition(async () => {
      await supprimerTournoi(tournamentId);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive" size="sm" />}>
        Supprimer
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supprimer « {tournamentNom} » ?</DialogTitle>
          <DialogDescription>
            Cette action supprime définitivement le tournoi, ses équipes, ses
            poules, son calendrier et ses inscriptions. Les joueurs eux-mêmes ne
            sont pas supprimés. Cette action est irréversible.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          <Label htmlFor="confirmation-suppression">
            Tape « {tournamentNom} » pour confirmer
          </Label>
          <Input
            id="confirmation-suppression"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button
            variant="destructive"
            disabled={!confirmationValide || isPending}
            onClick={supprimer}
          >
            {isPending ? "Suppression..." : "Supprimer définitivement"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
