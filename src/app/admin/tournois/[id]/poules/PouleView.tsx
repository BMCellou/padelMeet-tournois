"use client";

import { deplacerEquipe } from "./actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Groupe {
  id: string;
  nom: string;
  equipes: { id: string; nomAffiche: string }[];
}

export function PouleView({
  tournamentId,
  groupes,
  modifiable,
}: {
  tournamentId: string;
  groupes: Groupe[];
  modifiable: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {groupes.map((g) => (
        <Card key={g.id}>
          <CardHeader>
            <CardTitle className="text-base">Poule {g.nom}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {g.equipes.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-2 text-sm">
                <span>{e.nomAffiche}</span>
                {modifiable ? (
                  <Select
                    value={g.id}
                    onValueChange={(nouveauGroupId) => {
                      if (nouveauGroupId && nouveauGroupId !== g.id) {
                        deplacerEquipe(tournamentId, e.id, nouveauGroupId);
                      }
                    }}
                  >
                    <SelectTrigger size="sm" className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {groupes.map((cible) => (
                        <SelectItem key={cible.id} value={cible.id}>
                          Poule {cible.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
