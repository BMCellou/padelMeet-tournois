"use client";

import { useEffect, useRef, useState } from "react";
import { rechercherJoueurs, type JoueurRecherche } from "./actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

/**
 * Champs d'un joueur pour un formulaire d'inscription admin (paire ou
 * solo) : recherche parmi tous les joueurs déjà connus (ex. inscrits à un
 * tournoi précédent) pour réutiliser sa fiche, avec repli sur la saisie
 * manuelle habituelle si personne ne correspond. `suffixe` namespace les
 * champs (ex. "A"/"B" pour une paire, "" pour un solo).
 */
export function ChampsJoueur({
  suffixe,
  tournamentId,
  titre,
}: {
  suffixe: string;
  tournamentId: string;
  titre?: string;
}) {
  const [selection, setSelection] = useState<JoueurRecherche | null>(null);
  const [requete, setRequete] = useState("");
  const [resultats, setResultats] = useState<JoueurRecherche[]>([]);
  const [ouvert, setOuvert] = useState(false);
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
      rechercherJoueurs(q, tournamentId).then((r) => {
        setResultats(r);
        setOuvert(true);
      });
    }, 250);
    return () => clearTimeout(minuteur);
  }, [requete, tournamentId]);

  return (
    <div className="space-y-2 rounded-lg border p-3">
      {titre ? <p className="text-sm font-medium">{titre}</p> : null}

      {selection ? (
        <>
          <input type="hidden" name={`joueur${suffixe}Id`} value={selection.id} />
          <div className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm">
            <span>
              {selection.prenom} {selection.nom}
              {selection.classementFft ? (
                <span className="text-muted-foreground"> · {selection.classementFft}</span>
              ) : null}
              {selection.email ? (
                <span className="text-muted-foreground"> · {selection.email}</span>
              ) : null}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelection(null);
                setRequete("");
              }}
            >
              Changer
            </Button>
          </div>
        </>
      ) : (
        <>
          <div ref={conteneurRef} className="relative">
            <Input
              placeholder="Rechercher un joueur déjà connu (tournoi précédent, compte...)"
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
                      {j.classementFft ? (
                        <span className="text-muted-foreground"> · {j.classementFft}</span>
                      ) : null}
                      {j.email ? <span className="text-muted-foreground"> · {j.email}</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <p className="text-xs text-muted-foreground">
            Personne ne correspond ? Saisis un·e nouveau·elle joueur·se ci-dessous.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor={`prenom${suffixe}`}>Prénom</Label>
              <Input id={`prenom${suffixe}`} name={`prenom${suffixe}`} />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`nom${suffixe}`}>Nom</Label>
              <Input id={`nom${suffixe}`} name={`nom${suffixe}`} />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`sexe${suffixe}`}>Sexe (H/F)</Label>
              <Input id={`sexe${suffixe}`} name={`sexe${suffixe}`} maxLength={1} placeholder="H" />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`classement${suffixe}`}>Classement</Label>
              <Input id={`classement${suffixe}`} name={`classement${suffixe}`} placeholder="15/1" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
