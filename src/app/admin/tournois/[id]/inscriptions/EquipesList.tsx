"use client";

import { useActionState } from "react";
import { renommerEquipe, supprimerEquipe, remplacerJoueurEquipe } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface EquipeAffichee {
  id: string;
  nomAffiche: string;
  origine: string;
  joueurs: { id: string; nomComplet: string }[];
}

export interface JoueurDisponible {
  id: string;
  nomComplet: string;
}

function RenommerForm({ tournamentId, equipe }: { tournamentId: string; equipe: EquipeAffichee }) {
  const [, formAction, isPending] = useActionState(renommerEquipe, null);
  return (
    <form action={formAction} className="flex flex-1 gap-2">
      <input type="hidden" name="teamId" value={equipe.id} />
      <input type="hidden" name="tournamentId" value={tournamentId} />
      <Input name="nomAffiche" defaultValue={equipe.nomAffiche} className="h-8 flex-1 text-sm" />
      <Button type="submit" variant="ghost" size="sm" disabled={isPending}>
        Renommer
      </Button>
    </form>
  );
}

function JoueurSlot({
  tournamentId,
  equipeId,
  joueurActuel,
  joueursDisponibles,
}: {
  tournamentId: string;
  equipeId: string;
  joueurActuel: { id: string; nomComplet: string };
  joueursDisponibles: JoueurDisponible[];
}) {
  const options = [joueurActuel, ...joueursDisponibles];

  return (
    <Select
      value={joueurActuel.id}
      onValueChange={(nouveauId) => {
        if (nouveauId && nouveauId !== joueurActuel.id) {
          remplacerJoueurEquipe(tournamentId, equipeId, joueurActuel.id, nouveauId);
        }
      }}
    >
      <SelectTrigger size="sm" className="h-7 w-full text-xs">
        <SelectValue>
          {(valeur: string) => options.find((o) => o.id === valeur)?.nomComplet ?? valeur}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.id} value={o.id}>
            {o.nomComplet}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function EquipesList({
  tournamentId,
  equipes,
  joueursDisponibles,
}: {
  tournamentId: string;
  equipes: EquipeAffichee[];
  joueursDisponibles: JoueurDisponible[];
}) {
  if (equipes.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucune équipe pour l&apos;instant.</p>;
  }

  return (
    <ul className="divide-y rounded-lg border">
      {equipes.map((e) => (
        <li key={e.id} className="space-y-2 p-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <RenommerForm tournamentId={tournamentId} equipe={e} />
            <span className="shrink-0 text-xs text-muted-foreground">{e.origine}</span>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 text-muted-foreground"
              onClick={() => supprimerEquipe(e.id, tournamentId)}
            >
              Supprimer
            </Button>
          </div>
          {e.joueurs.length > 0 ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {e.joueurs.map((j) => (
                <JoueurSlot
                  key={j.id}
                  tournamentId={tournamentId}
                  equipeId={e.id}
                  joueurActuel={j}
                  joueursDisponibles={joueursDisponibles}
                />
              ))}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
