"use client";

import { useActionState } from "react";
import { creerTournoi } from "../actions";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const LIBELLES_GENRE: Record<string, string> = {
  masculin: "Masculin",
  feminin: "Féminin",
  mixte: "Mixte",
};

interface Club {
  id: string;
  nom: string;
}

export function NouveauTournoiForm({ clubs }: { clubs: Club[] }) {
  const [state, formAction, isPending] = useActionState(creerTournoi, null);
  const clubsParId = new Map(clubs.map((c) => [c.id, c]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nouveau tournoi</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {clubs.length > 1 ? (
            <div className="space-y-2">
              <Label htmlFor="clubId">Club</Label>
              <Select name="clubId" defaultValue={clubs[0].id}>
                <SelectTrigger id="clubId">
                  <SelectValue placeholder="Choisir un club">
                    {(valeur: string | null) =>
                      valeur ? (clubsParId.get(valeur)?.nom ?? valeur) : "Choisir un club"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {clubs.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <input type="hidden" name="clubId" value={clubs[0].id} />
          )}
          <div className="space-y-2">
            <Label htmlFor="nom">Nom du tournoi</Label>
            <Input id="nom" name="nom" required placeholder="Tournoi du 25 juillet" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" name="date" type="date" required />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="genre">Genre</Label>
              <Select name="genre">
                <SelectTrigger id="genre">
                  <SelectValue placeholder="Non précisé">
                    {(valeur: string | null) =>
                      valeur ? LIBELLES_GENRE[valeur] : "Non précisé"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="masculin">Masculin</SelectItem>
                  <SelectItem value="feminin">Féminin</SelectItem>
                  <SelectItem value="mixte">Mixte</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="niveau">Niveau</Label>
              <Input id="niveau" name="niveau" placeholder="P100-P250" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="nbQualifies">Qualifiés</Label>
              <Input
                id="nbQualifies"
                name="nbQualifies"
                type="number"
                min={2}
                defaultValue={8}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dureeMatchMin">Créneau (min)</Label>
              <Input
                id="dureeMatchMin"
                name="dureeMatchMin"
                type="number"
                min={1}
                defaultValue={25}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pauseMin">Pause (min)</Label>
              <Input
                id="pauseMin"
                name="pauseMin"
                type="number"
                min={0}
                defaultValue={5}
                required
              />
            </div>
          </div>
          {state && "error" in state ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : null}
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Création..." : "Créer le tournoi"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
