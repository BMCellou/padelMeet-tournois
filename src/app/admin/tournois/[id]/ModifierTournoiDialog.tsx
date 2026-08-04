"use client";

import { useState, useTransition } from "react";
import { modifierTournoi } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const LIBELLES_GENRE: Record<string, string> = {
  masculin: "Masculin",
  feminin: "Féminin",
  mixte: "Mixte",
};

const LIBELLES_STATUT: Record<string, string> = {
  brouillon: "Brouillon",
  publie: "Publié",
  en_cours: "En cours",
  termine: "Terminé",
};

export interface TournoiEditable {
  id: string;
  nom: string;
  date: string;
  genre: string | null;
  niveau: string | null;
  statut: string;
  nbQualifies: number | null;
  dureeMatchMin: number | null;
  pauseMin: number | null;
}

export function ModifierTournoiDialog({ tournoi }: { tournoi: TournoiEditable }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function envoyer(formData: FormData) {
    startTransition(async () => {
      const resultat = await modifierTournoi(null, formData);
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
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Modifier
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier le tournoi</DialogTitle>
        </DialogHeader>
        <form action={envoyer} className="space-y-4">
          <input type="hidden" name="tournamentId" value={tournoi.id} />
          <div className="space-y-1">
            <Label htmlFor="edit-nom">Nom du tournoi</Label>
            <Input id="edit-nom" name="nom" defaultValue={tournoi.nom} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="edit-date">Date</Label>
              <Input id="edit-date" name="date" type="date" defaultValue={tournoi.date} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-statut">Statut</Label>
              <Select name="statut" defaultValue={tournoi.statut}>
                <SelectTrigger id="edit-statut" className="w-full">
                  <SelectValue>
                    {(v: string) => LIBELLES_STATUT[v] ?? v}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LIBELLES_STATUT).map(([valeur, libelle]) => (
                    <SelectItem key={valeur} value={valeur}>
                      {libelle}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="edit-genre">Genre</Label>
              <Select name="genre" defaultValue={tournoi.genre ?? undefined}>
                <SelectTrigger id="edit-genre" className="w-full">
                  <SelectValue placeholder="Non précisé">
                    {(v: string | null) => (v ? LIBELLES_GENRE[v] : "Non précisé")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="masculin">Masculin</SelectItem>
                  <SelectItem value="feminin">Féminin</SelectItem>
                  <SelectItem value="mixte">Mixte</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-niveau">Niveau</Label>
              <Input id="edit-niveau" name="niveau" defaultValue={tournoi.niveau ?? ""} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="edit-nbQualifies">Qualifiés</Label>
              <Input
                id="edit-nbQualifies"
                name="nbQualifies"
                type="number"
                min={2}
                defaultValue={tournoi.nbQualifies ?? 8}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-dureeMatchMin">Créneau (min)</Label>
              <Input
                id="edit-dureeMatchMin"
                name="dureeMatchMin"
                type="number"
                min={1}
                defaultValue={tournoi.dureeMatchMin ?? 25}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-pauseMin">Pause (min)</Label>
              <Input
                id="edit-pauseMin"
                name="pauseMin"
                type="number"
                min={0}
                defaultValue={tournoi.pauseMin ?? 5}
                required
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
