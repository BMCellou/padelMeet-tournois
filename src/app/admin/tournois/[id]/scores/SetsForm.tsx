"use client";

import { useState } from "react";
import type { MatchFormat } from "@/lib/engine/types";
import type { SetSaisi } from "@/lib/engine/score";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function setsVides(format: MatchFormat): SetSaisi[] {
  const nbMax = 2 * format.nbSetsGagnants - 1;
  return Array.from({ length: nbMax }, () => ({
    jeuxA: 0,
    jeuxB: 0,
    tiebreakA: null,
    tiebreakB: null,
  }));
}

export function SetsForm({
  format,
  initialSets,
  onSubmit,
  isPending,
  error,
  libelleSubmit,
}: {
  format: MatchFormat;
  initialSets?: SetSaisi[];
  onSubmit: (sets: SetSaisi[]) => void;
  isPending: boolean;
  error: string | null;
  libelleSubmit: string;
}) {
  const [sets, setSets] = useState<SetSaisi[]>(() => {
    const base = setsVides(format);
    if (!initialSets) return base;
    return base.map((s, i) => initialSets[i] ?? s);
  });

  function maj(index: number, champ: keyof SetSaisi, valeur: string) {
    setSets((prev) =>
      prev.map((s, i) =>
        i === index
          ? { ...s, [champ]: valeur === "" ? (champ.startsWith("tiebreak") ? null : 0) : Number(valeur) }
          : s,
      ),
    );
  }

  function envoyer() {
    const setsAEnvoyer = sets.filter(
      (s, i) => i === 0 || s.jeuxA > 0 || s.jeuxB > 0 || s.tiebreakA != null || s.tiebreakB != null,
    );
    onSubmit(setsAEnvoyer);
  }

  return (
    <div className="space-y-4">
      {sets.map((s, i) => (
        <div key={i} className="space-y-2 rounded-md border p-3">
          <p className="text-xs font-medium text-muted-foreground">Set {i + 1}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor={`set-${i}-jeuxA`}>Jeux équipe A</Label>
              <Input
                id={`set-${i}-jeuxA`}
                type="number"
                min={0}
                max={format.jeuxPourGagner + 2}
                value={s.jeuxA}
                onChange={(e) => maj(i, "jeuxA", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`set-${i}-jeuxB`}>Jeux équipe B</Label>
              <Input
                id={`set-${i}-jeuxB`}
                type="number"
                min={0}
                max={format.jeuxPourGagner + 2}
                value={s.jeuxB}
                onChange={(e) => maj(i, "jeuxB", e.target.value)}
              />
            </div>
          </div>
          {format.jeuDecisif?.actif ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor={`set-${i}-tbA`}>
                  Tie-break A (si {format.jeuDecisif.declencheA}-{format.jeuDecisif.declencheA})
                </Label>
                <Input
                  id={`set-${i}-tbA`}
                  type="number"
                  min={0}
                  value={s.tiebreakA ?? ""}
                  onChange={(e) => maj(i, "tiebreakA", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`set-${i}-tbB`}>Tie-break B</Label>
                <Input
                  id={`set-${i}-tbB`}
                  type="number"
                  min={0}
                  value={s.tiebreakB ?? ""}
                  onChange={(e) => maj(i, "tiebreakB", e.target.value)}
                />
              </div>
            </div>
          ) : null}
        </div>
      ))}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="button" onClick={envoyer} disabled={isPending} className="w-full">
        {isPending ? "Enregistrement..." : libelleSubmit}
      </Button>
    </div>
  );
}
