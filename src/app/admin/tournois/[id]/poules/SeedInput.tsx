"use client";

import { useActionState } from "react";
import { definirSeed } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SeedInput({
  tournamentId,
  teamId,
  seedActuel,
}: {
  tournamentId: string;
  teamId: string;
  seedActuel: number | null;
}) {
  const [, formAction, isPending] = useActionState(definirSeed, null);

  return (
    <form action={formAction} className="flex items-center gap-1">
      <input type="hidden" name="tournamentId" value={tournamentId} />
      <input type="hidden" name="teamId" value={teamId} />
      <Input
        name="seed"
        type="number"
        min={1}
        defaultValue={seedActuel ?? ""}
        placeholder="TS"
        className="h-8 w-16"
      />
      <Button type="submit" variant="ghost" size="sm" disabled={isPending}>
        OK
      </Button>
    </form>
  );
}
