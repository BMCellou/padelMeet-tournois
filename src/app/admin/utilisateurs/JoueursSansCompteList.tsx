"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { PromouvoirJoueurDialog, type JoueurSansCompte } from "./PromouvoirJoueurDialog";

interface Tournoi {
  id: string;
  nom: string;
}

export function JoueursSansCompteList({
  joueurs,
  tournois,
}: {
  joueurs: JoueurSansCompte[];
  tournois: Tournoi[];
}) {
  const [recherche, setRecherche] = useState("");

  const joueursFiltres = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    if (!q) return joueurs;
    return joueurs.filter((j) =>
      `${j.prenom} ${j.nom} ${j.email ?? ""}`.toLowerCase().includes(q),
    );
  }, [joueurs, recherche]);

  if (joueurs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Tous les joueurs inscrits ont déjà un compte.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <Input
        placeholder="Rechercher un joueur..."
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
      />
      <ul className="max-h-96 divide-y overflow-y-auto rounded-lg border">
        {joueursFiltres.map((j) => (
          <li key={j.id} className="flex items-center justify-between gap-2 p-3 text-sm">
            <div>
              <p className="font-medium">
                {j.prenom} {j.nom}
              </p>
              <p className="text-xs text-muted-foreground">{j.email ?? "Pas d'e-mail enregistré"}</p>
            </div>
            <PromouvoirJoueurDialog joueur={j} tournois={tournois} />
          </li>
        ))}
        {joueursFiltres.length === 0 ? (
          <li className="p-3 text-sm text-muted-foreground">Aucun résultat.</li>
        ) : null}
      </ul>
    </div>
  );
}
