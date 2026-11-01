"use client";

import { useState, useTransition } from "react";
import { modifierTournoi } from "../actions";
import { cn } from "@/lib/utils";
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
  clubId: string | null;
  nom: string;
  date: string;
  genre: string | null;
  niveau: string | null;
  statut: string;
  nbQualifies: number | null;
  dureeMatchMin: number | null;
  pauseMin: number | null;
  maxParticipants: number | null;
  /** Le format a un tableau final (donc des qualifiés) ; sinon le champ disparaît. */
  avecQualifies: boolean;
  formatAnimation: string;
  /** Formats vers lesquels on peut basculer (le format actuel compris). */
  formatsChoix: { code: string; nom: string; description: string; aUnTableauFinal: boolean }[];
  /** Le tournoi n'a pas commencé : le format peut encore changer. */
  formatModifiable: boolean;
  /** Des poules ou des matchs existent : changer de format les supprime. */
  aUnTirage: boolean;
}

interface Club {
  id: string;
  nom: string;
}

export function ModifierTournoiDialog({
  tournoi,
  clubs,
}: {
  tournoi: TournoiEditable;
  clubs: Club[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [codeFormat, setCodeFormat] = useState(tournoi.formatAnimation);
  const formatChoisi = tournoi.formatsChoix.find((f) => f.code === codeFormat);
  const avecQualifies = formatChoisi?.aUnTableauFinal ?? tournoi.avecQualifies;
  const formatChange = codeFormat !== tournoi.formatAnimation;
  const choixPossible = tournoi.formatModifiable && tournoi.formatsChoix.length > 1;

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
    <Dialog
      open={open}
      onOpenChange={(ouvert) => {
        setOpen(ouvert);
        if (!ouvert) {
          setCodeFormat(tournoi.formatAnimation);
          setError(null);
        }
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Modifier
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier le tournoi</DialogTitle>
        </DialogHeader>
        <form action={envoyer} className="space-y-4">
          <input type="hidden" name="tournamentId" value={tournoi.id} />
          {choixPossible ? (
            <fieldset className="space-y-2">
              <legend className="mb-1 text-sm font-medium">Format d&apos;animation</legend>
              {tournoi.formatsChoix.map((f) => (
                <label
                  key={f.code}
                  className={cn(
                    "flex cursor-pointer gap-3 rounded-lg border p-3",
                    codeFormat === f.code ? "border-primary bg-primary/5" : "hover:bg-accent/50",
                  )}
                >
                  <input
                    type="radio"
                    name="formatAnimation"
                    value={f.code}
                    checked={codeFormat === f.code}
                    onChange={() => setCodeFormat(f.code)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-medium">{f.nom}</span>
                    <span className="block text-xs text-muted-foreground">{f.description}</span>
                  </span>
                </label>
              ))}
              {formatChange && tournoi.aUnTirage ? (
                <label className="flex gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
                  <input type="checkbox" name="reinitialiserTirage" className="mt-1" required />
                  <span>
                    Le tirage des poules et le calendrier déjà générés seront <strong>supprimés</strong> : il faudra
                    les refaire avec le nouveau format. Les inscriptions et les équipes ne changent pas.
                  </span>
                </label>
              ) : null}
            </fieldset>
          ) : (
            <p className="text-xs text-muted-foreground">
              {tournoi.formatsChoix.find((f) => f.code === tournoi.formatAnimation)?.nom ?? "Format"} :{" "}
              {tournoi.formatModifiable
                ? "ce format ne peut pas être échangé contre un autre (inscriptions par joueur)."
                : "le format est verrouillé, le tournoi a commencé."}
            </p>
          )}
          <div className="space-y-1">
            <Label htmlFor="edit-nom">Nom du tournoi</Label>
            <Input id="edit-nom" name="nom" defaultValue={tournoi.nom} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="edit-clubId">Club</Label>
            <Select name="clubId" defaultValue={tournoi.clubId ?? "aucun"}>
              <SelectTrigger id="edit-clubId" className="w-full">
                <SelectValue placeholder="Aucun club pour l'instant">
                  {(v: string | null) => {
                    if (!v || v === "aucun") return "Aucun club pour l'instant";
                    return clubs.find((c) => c.id === v)?.nom ?? v;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="aucun">Aucun club pour l&apos;instant</SelectItem>
                {clubs.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <div className={avecQualifies ? "grid grid-cols-3 gap-3" : "grid grid-cols-2 gap-3"}>
            {avecQualifies ? (
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
            ) : null}
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
          <div className="space-y-1">
            <Label htmlFor="edit-maxParticipants">Nombre maximum de joueurs</Label>
            <Input
              id="edit-maxParticipants"
              name="maxParticipants"
              type="number"
              min={2}
              defaultValue={tournoi.maxParticipants ?? ""}
              placeholder="Illimité"
            />
            <p className="text-xs text-muted-foreground">
              Une paire compte pour 2. Vide = pas de limite. Le nombre de places restantes est affiché
              aux inscrits.
            </p>
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
