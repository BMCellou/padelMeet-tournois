"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { rechercherJoueursPourRemplacement, remplacerJoueurDansEquipe, type JoueurRecherche } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function RemplacerJoueurDialog({
  teamId,
  tournamentId,
  tournamentNom,
  equipeNom,
  ancienPlayerId,
  ancienNomComplet,
}: {
  teamId: string;
  tournamentId: string;
  tournamentNom: string;
  equipeNom: string;
  ancienPlayerId: string;
  ancienNomComplet: string;
}) {
  const [open, setOpen] = useState(false);
  const [requete, setRequete] = useState("");
  const [resultats, setResultats] = useState<JoueurRecherche[]>([]);
  const [ouvert, setOuvert] = useState(false);
  const [selection, setSelection] = useState<JoueurRecherche | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const conteneurRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function surClicDehors(e: MouseEvent) {
      if (conteneurRef.current && !conteneurRef.current.contains(e.target as Node)) {
        setOuvert(false);
      }
    }
    document.addEventListener("mousedown", surClicDehors);
    return () => document.removeEventListener("mousedown", surClicDehors);
  }, []);

  useEffect(() => {
    const q = requete.trim();
    const minuteur = setTimeout(() => {
      if (q.length < 2) {
        setResultats([]);
        return;
      }
      rechercherJoueursPourRemplacement(q, tournamentId).then((r) => {
        setResultats(r);
        setOuvert(true);
      });
    }, 250);
    return () => clearTimeout(minuteur);
  }, [requete, tournamentId]);

  function confirmer() {
    if (!selection) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("teamId", teamId);
      formData.set("ancienPlayerId", ancienPlayerId);
      formData.set("nouveauPlayerId", selection.id);
      const resultat = await remplacerJoueurDansEquipe(null, formData);
      if ("error" in resultat) {
        setError(resultat.error);
      } else {
        setOpen(false);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) {
          setError(null);
          setSelection(null);
          setRequete("");
        }
      }}
    >
      <DialogTrigger render={<Button type="button" variant="ghost" size="sm" />}>
        Remplacer
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Remplacer {ancienNomComplet} — {equipeNom} ({tournamentNom})
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {selection ? (
            <div className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm">
              <span>
                {selection.prenom} {selection.nom}
                {selection.email ? (
                  <span className="text-muted-foreground"> · {selection.email}</span>
                ) : null}
              </span>
              <Button type="button" variant="ghost" size="sm" onClick={() => setSelection(null)}>
                Changer
              </Button>
            </div>
          ) : (
            <div ref={conteneurRef} className="relative">
              <Input
                placeholder="Rechercher le joueur remplaçant..."
                value={requete}
                onChange={(e) => setRequete(e.target.value)}
                onFocus={() => resultats.length > 0 && setOuvert(true)}
                autoComplete="off"
              />
              {ouvert && resultats.length > 0 ? (
                <ul className="absolute z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-md border bg-popover shadow-md">
                  {resultats.map((j) => (
                    <li key={j.id}>
                      <button
                        type="button"
                        className="block w-full px-3 py-2 text-left text-sm hover:bg-accent"
                        onClick={() => {
                          setSelection(j);
                          setRequete("");
                          setOuvert(false);
                        }}
                      >
                        {j.prenom} {j.nom}
                        {j.email ? <span className="text-muted-foreground"> · {j.email}</span> : null}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button
              type="button"
              className="w-full"
              disabled={!selection || isPending}
              onClick={confirmer}
            >
              {isPending ? "Remplacement..." : "Confirmer le remplacement"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
