"use client";

import { useState, useTransition } from "react";
import { useActionState } from "react";
import { ajouterRole, retirerRole } from "./actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export interface RoleAffiche {
  membershipId: string;
  role: "admin" | "scorekeeper";
  tournamentId: string | null;
  tournamentNom: string | null;
}

interface Tournoi {
  id: string;
  nom: string;
}

function RetirerRoleButton({ role }: { role: RoleAffiche }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        className="text-muted-foreground"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const resultat = await retirerRole(role.membershipId, role.role);
            setError("error" in resultat ? resultat.error : null);
          })
        }
      >
        Retirer
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function AjouterRoleForm({ userId, tournois }: { userId: string; tournois: Tournoi[] }) {
  const [state, formAction, isPending] = useActionState(ajouterRole, null);
  const [role, setRole] = useState<"admin" | "scorekeeper">("scorekeeper");

  return (
    <form action={formAction} className="space-y-2 border-t pt-3">
      <input type="hidden" name="userId" value={userId} />
      <div className="space-y-1">
        <Label htmlFor="role">Nouveau rôle</Label>
        <Select name="role" value={role} onValueChange={(v) => setRole(v as "admin" | "scorekeeper")}>
          <SelectTrigger id="role" className="w-full">
            <SelectValue>{(v: string) => (v === "admin" ? "Admin" : "Scoreur")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="scorekeeper">Scoreur d&apos;un tournoi</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {role === "scorekeeper" ? (
        <div className="space-y-1">
          <Label htmlFor="tournamentId">Tournoi</Label>
          <Select name="tournamentId">
            <SelectTrigger id="tournamentId" className="w-full">
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
      <Button type="submit" size="sm" disabled={isPending} className="w-full">
        {isPending ? "Ajout..." : "Ajouter ce rôle"}
      </Button>
    </form>
  );
}

export function GererRolesDialog({
  userId,
  nomAffiche,
  roles,
  tournois,
}: {
  userId: string;
  nomAffiche: string;
  roles: RoleAffiche[];
  tournois: Tournoi[];
}) {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="ghost" size="sm" />}>Rôles</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rôles — {nomAffiche}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {roles.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun rôle staff pour l&apos;instant.</p>
          ) : (
            <ul className="divide-y rounded-lg border">
              {roles.map((r) => (
                <li
                  key={r.membershipId}
                  className="flex items-center justify-between gap-2 p-3 text-sm"
                >
                  <Badge variant={r.role === "admin" ? "default" : "outline"}>
                    {r.role === "admin" ? "Admin" : `Scoreur · ${r.tournamentNom}`}
                  </Badge>
                  <RetirerRoleButton role={r} />
                </li>
              ))}
            </ul>
          )}
          <AjouterRoleForm userId={userId} tournois={tournois} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
