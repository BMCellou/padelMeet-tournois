"use client";

import { useState } from "react";
import type { MatchFormat } from "@/lib/engine/types";
import { estEgaliteAuBuzzer, expliquerScoreIndetermine, type SetSaisi } from "@/lib/engine/score";
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

function DepartageBuzzer({
  index,
  set,
  regle,
  onGagnant,
  onPoints,
}: {
  index: number;
  set: SetSaisi;
  regle: "point_en_or" | "jeu_decisif" | "nul_interdit";
  onGagnant: (g: "a" | "b") => void;
  onPoints: (champ: "tiebreakA" | "tiebreakB", valeur: string) => void;
}) {
  const consigne =
    regle === "jeu_decisif"
      ? `Égalité ${set.jeuxA}-${set.jeuxB} au buzzer : score du jeu décisif`
      : regle === "nul_interdit"
        ? `Égalité ${set.jeuxA}-${set.jeuxB} au buzzer : un nul est impossible, quelle équipe est déclarée vainqueur ?`
        : `Égalité ${set.jeuxA}-${set.jeuxB} au buzzer : qui a gagné le point en or ?`;

  return (
    <div className="space-y-2 rounded-md bg-muted/40 p-2">
      <p className="text-xs font-medium">{consigne}</p>
      {regle === "jeu_decisif" ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor={`set-${index}-bzA`}>Points équipe A</Label>
            <Input
              id={`set-${index}-bzA`}
              type="number"
              min={0}
              value={set.tiebreakA ?? ""}
              onChange={(e) => onPoints("tiebreakA", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`set-${index}-bzB`}>Points équipe B</Label>
            <Input
              id={`set-${index}-bzB`}
              type="number"
              min={0}
              value={set.tiebreakB ?? ""}
              onChange={(e) => onPoints("tiebreakB", e.target.value)}
            />
          </div>
        </div>
      ) : (
        <div className="flex gap-4 text-sm">
          {(["a", "b"] as const).map((g) => (
            <label key={g} className="flex items-center gap-2">
              <input
                type="radio"
                name={`buzzer-${index}`}
                checked={g === "a" ? (set.tiebreakA ?? 0) > (set.tiebreakB ?? 0) : (set.tiebreakB ?? 0) > (set.tiebreakA ?? 0)}
                onChange={() => onGagnant(g)}
              />
              Équipe {g.toUpperCase()}
            </label>
          ))}
        </div>
      )}
    </div>
  );
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

  function departager(index: number, gagnant: "a" | "b") {
    setSets((prev) =>
      prev.map((s, i) =>
        i === index ? { ...s, tiebreakA: gagnant === "a" ? 1 : 0, tiebreakB: gagnant === "a" ? 0 : 1 } : s,
      ),
    );
  }

  function envoyer() {
    const setsAEnvoyer = sets.filter(
      (s, i) => i === 0 || s.jeuxA > 0 || s.jeuxB > 0 || s.tiebreakA != null || s.tiebreakB != null,
    );
    onSubmit(setsAEnvoyer);
  }

  // Dès qu'un set est saisi, dit tout de suite pourquoi le score ne désigne
  // pas encore de vainqueur et quoi faire, plutôt que d'attendre un refus à la validation.
  const saisis = sets.filter((s, i) => i === 0 || s.jeuxA > 0 || s.jeuxB > 0 || s.tiebreakA != null || s.tiebreakB != null);
  const aSaisiQuelqueChose = saisis.some((s) => s.jeuxA > 0 || s.jeuxB > 0);
  const indication = aSaisiQuelqueChose ? expliquerScoreIndetermine(saisis, format) : null;

  return (
    <div className="space-y-4">
      {sets.map((s, i) => {
        // Set décisif joué en super tie-break : on saisit des points (pas
        // de jeux), sans tie-break à l'intérieur.
        const superTb = format.setDecisifSuperTiebreak && i === sets.length - 1;
        const unite = superTb ? "Points" : "Jeux";
        const plafond = superTb ? undefined : format.jeuxPourGagner + 2;
        return (
        <div key={i} className="space-y-2 rounded-md border p-3">
          <p className="text-xs font-medium text-muted-foreground">
            {superTb ? "Super tie-break" : `Set ${i + 1}`}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor={`set-${i}-jeuxA`}>{unite} équipe A</Label>
              <Input
                id={`set-${i}-jeuxA`}
                type="number"
                min={0}
                max={plafond}
                value={s.jeuxA}
                onChange={(e) => maj(i, "jeuxA", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`set-${i}-jeuxB`}>{unite} équipe B</Label>
              <Input
                id={`set-${i}-jeuxB`}
                type="number"
                min={0}
                max={plafond}
                value={s.jeuxB}
                onChange={(e) => maj(i, "jeuxB", e.target.value)}
              />
            </div>
          </div>
          {!superTb && estEgaliteAuBuzzer(s, format) ? (
            <DepartageBuzzer
              index={i}
              set={s}
              regle={format.egaliteAuBuzzer ?? "point_en_or"}
              onGagnant={(g) => departager(i, g)}
              onPoints={(champ, valeur) => maj(i, champ, valeur)}
            />
          ) : null}
          {!superTb && format.jeuDecisif?.actif && !estEgaliteAuBuzzer(s, format) ? (
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
        );
      })}
      {indication ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-sm" role="status">
          {indication}
        </p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="button" onClick={envoyer} disabled={isPending} className="w-full">
        {isPending ? "Enregistrement..." : libelleSubmit}
      </Button>
    </div>
  );
}
