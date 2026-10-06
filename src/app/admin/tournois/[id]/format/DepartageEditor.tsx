"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { CritereDepartage } from "@/lib/engine/classement";
import { CRITERES_DEPARTAGE } from "@/lib/engine/formatMatch";

const libelle = (id: CritereDepartage) => CRITERES_DEPARTAGE.find((c) => c.id === id)!;

/**
 * Liste réordonnable (glisser-déposer, ou flèches au clavier) des
 * critères de départage. `actifs` = critères activés dans l'ordre ; les
 * autres sont proposés en dessous. « Victoires » reste figé en premier.
 */
export function DepartageEditor({
  actifs,
  onChange,
  disabled,
}: {
  actifs: CritereDepartage[];
  onChange: (c: CritereDepartage[]) => void;
  disabled?: boolean;
}) {
  const [glisse, setGlisse] = useState<CritereDepartage | null>(null);
  const inactifs = CRITERES_DEPARTAGE.map((c) => c.id).filter((id) => !actifs.includes(id));

  function deplacer(id: CritereDepartage, versIndex: number) {
    const sans = actifs.filter((c) => c !== id);
    const cible = Math.min(Math.max(versIndex, 1), sans.length);
    onChange([...sans.slice(0, cible), id, ...sans.slice(cible)]);
  }

  return (
    <div className="space-y-3">
      <ol className="space-y-1">
        {actifs.map((id, index) => {
          const fige = id === "victoires";
          return (
            <li
              key={id}
              draggable={!disabled && !fige}
              onDragStart={() => !disabled && !fige && setGlisse(id)}
              onDragEnd={() => setGlisse(null)}
              onDragOver={(e) => {
                if (glisse) e.preventDefault();
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (!disabled && glisse && glisse !== id) deplacer(glisse, index);
                setGlisse(null);
              }}
              className={`flex items-center gap-2 rounded-md border bg-background p-2 text-sm ${
                glisse === id ? "opacity-50" : ""
              } ${!disabled && !fige ? "cursor-grab" : ""}`}
            >
              <span className="w-5 text-center text-muted-foreground" aria-hidden>
                {fige ? "🔒" : "⠿"}
              </span>
              <span className="w-5 text-muted-foreground">{index + 1}.</span>
              <div className="flex-1">
                <p className="font-medium">{libelle(id).libelle}</p>
                <p className="text-xs text-muted-foreground">
                  {fige ? "Toujours en premier. " : ""}
                  {libelle(id).aide}
                </p>
              </div>
              {!fige ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label={`Monter ${libelle(id).libelle}`}
                    disabled={disabled || index <= 1}
                    onClick={() => deplacer(id, index - 1)}
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label={`Descendre ${libelle(id).libelle}`}
                    disabled={disabled || index === actifs.length - 1}
                    onClick={() => deplacer(id, index + 1)}
                  >
                    ↓
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={disabled}
                    onClick={() => onChange(actifs.filter((c) => c !== id))}
                  >
                    Désactiver
                  </Button>
                </>
              ) : null}
            </li>
          );
        })}
      </ol>

      {inactifs.length > 0 ? (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Critères désactivés</p>
          <ul className="space-y-1">
            {inactifs.map((id) => (
              <li key={id} className="flex items-center gap-2 rounded-md border border-dashed p-2 text-sm">
                <div className="flex-1">
                  <p className="text-muted-foreground">{libelle(id).libelle}</p>
                  <p className="text-xs text-muted-foreground">{libelle(id).aide}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={disabled}
                  onClick={() => onChange([...actifs, id])}
                >
                  Activer
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
