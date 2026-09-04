"use client";

import { useState } from "react";
import { useActionState } from "react";
import { creerUtilisateur } from "./actions";
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

interface Tournoi {
  id: string;
  nom: string;
}

const LIBELLES_ROLE: Record<string, string> = {
  aucun: "Aucun (simple participant)",
  admin: "Admin",
  scorekeeper: "Scoreur d'un tournoi",
};

export function CreerUtilisateurForm({ tournois }: { tournois: Tournoi[] }) {
  const [state, formAction, isPending] = useActionState(creerUtilisateur, null);
  const [role, setRole] = useState<"aucun" | "admin" | "scorekeeper">("aucun");
  // Force le formulaire à se réinitialiser après une création réussie,
  // sans perdre le message affichant le mot de passe généré (lui reste
  // dans `state`, porté par le parent).
  const [formKey, setFormKey] = useState(0);

  return (
    <div className="space-y-4">
      <form key={formKey} action={formAction} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="cu-prenom">Prénom</Label>
            <Input id="cu-prenom" name="prenom" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cu-nom">Nom</Label>
            <Input id="cu-nom" name="nom" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cu-sexe">Sexe (H/F)</Label>
            <Input id="cu-sexe" name="sexe" maxLength={1} placeholder="H" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cu-telephone">Téléphone</Label>
            <Input id="cu-telephone" name="telephone" />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="cu-email">E-mail</Label>
          <Input id="cu-email" name="email" type="email" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cu-role">Rôle</Label>
          <Select
            name="role"
            value={role}
            onValueChange={(v) => setRole(v as "aucun" | "admin" | "scorekeeper")}
          >
            <SelectTrigger id="cu-role" className="w-full">
              <SelectValue>{(v: string) => LIBELLES_ROLE[v] ?? v}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(LIBELLES_ROLE).map(([valeur, libelle]) => (
                <SelectItem key={valeur} value={valeur}>
                  {libelle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {role === "scorekeeper" ? (
          <div className="space-y-1">
            <Label htmlFor="cu-tournamentId">Tournoi</Label>
            <Select name="tournamentId">
              <SelectTrigger id="cu-tournamentId" className="w-full">
                <SelectValue placeholder="Choisir un tournoi">
                  {(v: string | null) => tournois.find((t) => t.id === v)?.nom ?? "Choisir un tournoi"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {tournois.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        {state && "error" in state ? <p className="text-sm text-destructive">{state.error}</p> : null}
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? "Création..." : "Créer l'utilisateur"}
        </Button>
      </form>
      {state && "success" in state ? (
        <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
          <p>
            Compte créé. Mot de passe provisoire (à transmettre en personne — il ne sera plus
            affiché ensuite) :
          </p>
          <code className="block rounded bg-background px-2 py-1 font-mono text-base tracking-wide">
            {state.motDePasseProvisoire}
          </code>
          <p className="text-xs text-muted-foreground">
            Un changement de mot de passe sera exigé à la première connexion.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setFormKey((k) => k + 1)}
          >
            Créer un autre utilisateur
          </Button>
        </div>
      ) : null}
    </div>
  );
}
