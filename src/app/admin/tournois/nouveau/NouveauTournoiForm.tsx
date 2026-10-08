"use client";

import { useActionState, useState } from "react";
import { CODE_FORMAT_PAR_DEFAUT, getFormat, listerFormats } from "@/lib/engine/formats";
import { cn } from "@/lib/utils";
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

function formaterDuree(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}

export function NouveauTournoiForm({ clubs }: { clubs: Club[] }) {
  const [state, formAction, isPending] = useActionState(creerTournoi, null);
  const clubsParId = new Map(clubs.map((c) => [c.id, c]));
  const formats = listerFormats();
  const [codeFormat, setCodeFormat] = useState<string>(CODE_FORMAT_PAR_DEFAUT);
  const format = getFormat(codeFormat);
  const rotation = format.rotation;

  // Réglages d'un format à rotation, pilotés pour afficher l'estimation en direct.
  const [joueurs, setJoueurs] = useState(16);
  const [terrains, setTerrains] = useState(4);
  const [tours, setTours] = useState<number | null>(null);
  const [dureeManche, setDureeManche] = useState(15);
  const [rotationMin, setRotationMin] = useState(5);
  const nbTours = tours ?? rotation?.nbToursParDefaut(joueurs) ?? 0;
  const estimation = rotation?.estimer({ effectif: joueurs, terrains, nbTours, dureeMancheMin: dureeManche, pauseMin: rotationMin });
  const verdict = rotation ? format.validerEffectif(joueurs, terrains) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nouveau tournoi</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="mb-1 text-sm font-medium">1. Format d&apos;animation</legend>
            {formats.map((f) => (
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
                  <span className="block font-medium">{f.nom}</span>
                  <span className="block text-sm text-muted-foreground">{f.description}</span>
                </span>
              </label>
            ))}
          </fieldset>
          {clubs.length > 0 ? (
            <div className="space-y-2">
              <Label htmlFor="clubId">Club</Label>
              <Select name="clubId" defaultValue="aucun">
                <SelectTrigger id="clubId">
                  <SelectValue placeholder="Aucun club pour l'instant">
                    {(valeur: string | null) =>
                      valeur && valeur !== "aucun"
                        ? (clubsParId.get(valeur)?.nom ?? valeur)
                        : "Aucun club pour l'instant"
                    }
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
              <p className="text-xs text-muted-foreground">
                Tu peux laisser vide et l&apos;assigner plus tard depuis la fiche du tournoi.
              </p>
            </div>
          ) : (
            <>
              <input type="hidden" name="clubId" value="aucun" />
              <p className="text-sm text-muted-foreground">
                Aucun club pour l&apos;instant — tu pourras en assigner un plus tard depuis la fiche
                du tournoi.
              </p>
            </>
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
          {rotation ? (
            <div className="space-y-4" data-testid="reglages-rotation">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxParticipants">Nombre de joueurs</Label>
                  <Input
                    id="maxParticipants"
                    name="maxParticipants"
                    type="number"
                    min={4}
                    value={joueurs}
                    onChange={(e) => setJoueurs(Number(e.target.value))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nbTerrains">Terrains</Label>
                  <Input
                    id="nbTerrains"
                    name="nbTerrains"
                    type="number"
                    min={1}
                    value={terrains}
                    onChange={(e) => setTerrains(Number(e.target.value))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nbTours">Manches (tours)</Label>
                  <Input
                    id="nbTours"
                    name="nbTours"
                    type="number"
                    min={1}
                    value={nbTours}
                    onChange={(e) => setTours(Number(e.target.value))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pointsCible">Points par manche</Label>
                  <Input
                    id="pointsCible"
                    name="pointsCible"
                    type="number"
                    min={2}
                    max={100}
                    defaultValue={rotation.pointsCibleParDefaut}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dureeMatchMin">Durée d&apos;une manche (min)</Label>
                  <Input
                    id="dureeMatchMin"
                    name="dureeMatchMin"
                    type="number"
                    min={1}
                    value={dureeManche}
                    onChange={(e) => setDureeManche(Number(e.target.value))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pauseMin">Rotation entre tours (min)</Label>
                  <Input
                    id="pauseMin"
                    name="pauseMin"
                    type="number"
                    min={0}
                    value={rotationMin}
                    onChange={(e) => setRotationMin(Number(e.target.value))}
                    required
                  />
                </div>
              </div>
              {estimation ? (
                <div className="rounded-lg border bg-muted/40 p-3 text-sm" data-testid="estimation-duree">
                  <p className="font-medium">
                    Durée estimée : {formaterDuree(estimation.dureeMin)}
                  </p>
                  <p className="text-muted-foreground">
                    {nbTours} tour{nbTours > 1 ? "s" : ""} · {estimation.manchesParTour} manche
                    {estimation.manchesParTour > 1 ? "s" : ""} par tour · {estimation.nbManches} manches au total
                  </p>
                </div>
              ) : null}
              {joueurs % 4 !== 0 && estimation && joueurs >= 4 ? (
                <p
                  className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm"
                  role="status"
                  data-testid="avertissement-effectif"
                >
                  {joueurs} joueurs : l&apos;effectif n&apos;est pas un multiple de 4, donc {estimation.exemptesParTour} joueur
                  {estimation.exemptesParTour > 1 ? "s" : ""} seront exemptés à chaque tour (exemptions réparties équitablement).
                </p>
              ) : joueurs % 4 === 0 && estimation && estimation.exemptesParTour > 0 ? (
                <p className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm" role="status">
                  {terrains} terrain{terrains > 1 ? "s" : ""} pour {joueurs} joueurs : {estimation.exemptesParTour} joueurs seront
                  exemptés à chaque tour.
                </p>
              ) : null}
              {verdict && !verdict.ok ? <p className="text-sm text-destructive">{verdict.message}</p> : null}
              {verdict?.ok && verdict.avertissement && joueurs > 40 ? (
                <p className="text-sm text-muted-foreground">{verdict.avertissement}</p>
              ) : null}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {format.aUnTableauFinal ? (
                  <div className="space-y-2">
                    <Label htmlFor="nbQualifies">Qualifiés</Label>
                    <Input id="nbQualifies" name="nbQualifies" type="number" min={2} defaultValue={8} required />
                  </div>
                ) : null}
                <div className="space-y-2">
                  <Label htmlFor="dureeMatchMin">Créneau (min)</Label>
                  <Input id="dureeMatchMin" name="dureeMatchMin" type="number" min={1} defaultValue={25} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pauseMin">Pause (min)</Label>
                  <Input id="pauseMin" name="pauseMin" type="number" min={0} defaultValue={5} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxParticipants">Nombre maximum de joueurs</Label>
                <Input id="maxParticipants" name="maxParticipants" type="number" min={2} placeholder="Illimité" />
                <p className="text-xs text-muted-foreground">
                  Une paire compte pour 2. Vide = pas de limite. Modifiable plus tard.
                </p>
              </div>
            </>
          )}
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
