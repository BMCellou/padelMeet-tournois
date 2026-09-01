"use client";

import { useActionState } from "react";
import { modifierMonProfil } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface MonProfil {
  nom: string;
  prenom: string;
  sexe: string | null;
  classementFft: string | null;
  telephone: string | null;
  email: string | null;
}

export function ProfilForm({ profil }: { profil: MonProfil }) {
  const [state, formAction, isPending] = useActionState(modifierMonProfil, null);

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="prenom">Prénom</Label>
          <Input id="prenom" name="prenom" defaultValue={profil.prenom} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="nom">Nom</Label>
          <Input id="nom" name="nom" defaultValue={profil.nom} required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="sexe">Sexe (H/F)</Label>
          <Input id="sexe" name="sexe" maxLength={1} defaultValue={profil.sexe ?? ""} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="classementFft">Classement</Label>
          <Input
            id="classementFft"
            name="classementFft"
            placeholder="15/1"
            defaultValue={profil.classementFft ?? ""}
          />
        </div>
        <div className="col-span-2 space-y-1">
          <Label htmlFor="telephone">Téléphone</Label>
          <Input id="telephone" name="telephone" defaultValue={profil.telephone ?? ""} />
        </div>
      </div>
      <div className="space-y-1">
        <Label>E-mail</Label>
        <p className="text-sm text-muted-foreground">{profil.email}</p>
      </div>
      {state && "error" in state ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state && "success" in state ? (
        <p className="text-sm text-primary">Profil mis à jour.</p>
      ) : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Enregistrement..." : "Enregistrer"}
      </Button>
    </form>
  );
}
