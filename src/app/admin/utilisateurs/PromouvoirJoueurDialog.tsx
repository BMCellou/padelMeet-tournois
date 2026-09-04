"use client";

import { useState, useTransition } from "react";
import { creerCompteDepuisJoueur } from "./actions";
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

export interface JoueurSansCompte {
  id: string;
  nom: string;
  prenom: string;
  email: string | null;
}

interface Tournoi {
  id: string;
  nom: string;
}

const LIBELLES_ROLE: Record<string, string> = {
  aucun: "Aucun (simple participant)",
  admin: "Admin",
  scorekeeper: "Scoreur d'un tournoi",
};

export function PromouvoirJoueurDialog({
  joueur,
  tournois,
}: {
  joueur: JoueurSansCompte;
  tournois: Tournoi[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [role, setRole] = useState<"aucun" | "admin" | "scorekeeper">("scorekeeper");

  function envoyer(formData: FormData) {
    startTransition(async () => {
      const resultat = await creerCompteDepuisJoueur(null, formData);
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
      onOpenChange={(v) => {
        setOpen(v);
        if (v) {
          setRole("scorekeeper");
          setError(null);
        }
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        Créer un compte
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Créer un compte — {joueur.prenom} {joueur.nom}
          </DialogTitle>
        </DialogHeader>
        <form action={envoyer} className="space-y-3">
          <input type="hidden" name="playerId" value={joueur.id} />
          <div className="space-y-1">
            <Label htmlFor="pj-email">E-mail</Label>
            <Input
              id="pj-email"
              name="email"
              type="email"
              required
              defaultValue={joueur.email ?? ""}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pj-password">Mot de passe initial</Label>
            <Input id="pj-password" name="password" type="text" required minLength={8} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pj-role">Rôle</Label>
            <Select
              name="role"
              value={role}
              onValueChange={(v) => setRole(v as "aucun" | "admin" | "scorekeeper")}
            >
              <SelectTrigger id="pj-role" className="w-full">
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
              <Label htmlFor="pj-tournamentId">Tournoi</Label>
              <Select name="tournamentId">
                <SelectTrigger id="pj-tournamentId" className="w-full">
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
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? "Création..." : "Créer le compte"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
