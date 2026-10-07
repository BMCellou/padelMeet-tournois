"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MatchFormat } from "@/lib/engine/types";
import { PREREGLAGES_FORMAT, resumerFormat, validerFormat } from "@/lib/engine/formatMatch";

const selectClasse = "h-9 rounded-md border bg-background px-2 text-sm disabled:opacity-60";

function nombre(valeur: string): number {
  return valeur === "" ? 0 : Number(valeur);
}

function Interrupteur({
  id,
  label,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <input
        id={id}
        type="checkbox"
        className="size-4"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <Label htmlFor={id}>{label}</Label>
    </div>
  );
}

function Champ({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

/**
 * Formulaire complet d'un MatchFormat, avec résumé en français toujours
 * visible. Les réglages sans objet sont masqués (pas de super tie-break
 * à un set gagnant sauf « super tie-break seul », pas de réglages de
 * tie-break s'il est désactivé, pas de règle de fin sans limite de temps).
 */
export function FormatEditor({
  value,
  onChange,
  disabled,
  idPrefix,
}: {
  value: MatchFormat;
  onChange: (f: MatchFormat) => void;
  disabled?: boolean;
  idPrefix: string;
}) {
  const id = (n: string) => `${idPrefix}-${n}`;
  const maj = (patch: Partial<MatchFormat>) => onChange({ ...value, ...patch });

  const resultat = validerFormat(value);
  const seul = value.nbSetsGagnants === 1 && value.setDecisifSuperTiebreak;
  const jd = value.jeuDecisif;
  const pointsST = value.superTiebreakPoints ?? 10;

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-primary/30 bg-primary/5 p-3">
        <p className="text-xs font-medium text-muted-foreground">Résumé du format</p>
        <p className="text-sm font-medium" data-testid={id("resume")}>
          {resumerFormat(value)}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {PREREGLAGES_FORMAT.map((p) => (
          <Button
            key={p.id}
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={() => onChange({ ...p.format })}
          >
            {p.libelle}
          </Button>
        ))}
      </div>

      {!resultat.ok ? (
        <ul className="space-y-1 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
          {resultat.erreurs.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Champ id={id("sets")} label="Sets gagnants">
          <select
            id={id("sets")}
            className={selectClasse}
            disabled={disabled}
            value={value.nbSetsGagnants}
            onChange={(e) =>
              maj({ nbSetsGagnants: Number(e.target.value) as 1 | 2, setDecisifSuperTiebreak: false })
            }
          >
            <option value={1}>1 set</option>
            <option value={2}>2 sets (3e set si 1-1)</option>
          </select>
        </Champ>

        {!seul ? (
          <>
            <Champ id={id("jeux")} label="Jeux pour gagner un set">
              <Input
                id={id("jeux")}
                type="number"
                min={1}
                disabled={disabled}
                value={value.jeuxPourGagner}
                onChange={(e) => maj({ jeuxPourGagner: nombre(e.target.value) })}
              />
            </Champ>
            <Champ id={id("ecart")} label="Écart requis (jeux)">
              <Input
                id={id("ecart")}
                type="number"
                min={1}
                disabled={disabled}
                value={value.ecartRequis}
                onChange={(e) => maj({ ecartRequis: nombre(e.target.value) })}
              />
            </Champ>
          </>
        ) : null}
      </div>

      {!seul ? (
        <div className="space-y-2">
          <Interrupteur
            id={id("pd")}
            label="Point décisif à 40-40 (sinon avantage)"
            checked={value.pointDecisif}
            disabled={disabled}
            onChange={(v) => maj({ pointDecisif: v })}
          />
          {value.pointDecisif ? (
            <div className="pl-6">
              <Interrupteur
                id={id("receveur")}
                label="Le receveur choisit son côté sur le point décisif"
                checked={value.choixReceveur}
                disabled={disabled}
                onChange={(v) => maj({ choixReceveur: v })}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {!seul ? (
        <div className="space-y-3 rounded-md border p-3">
          <Interrupteur
            id={id("jd")}
            label="Jeu décisif (tie-break) à égalité"
            checked={!!jd?.actif}
            disabled={disabled}
            onChange={(actif) =>
              maj({
                jeuDecisif: jd
                  ? { ...jd, actif }
                  : { actif, declencheA: Math.max(1, value.jeuxPourGagner - 1), points: 7, ecart: 2 },
              })
            }
          />
          {jd?.actif ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <Champ id={id("jd-seuil")} label="Se déclenche à (jeux partout)">
                <Input
                  id={id("jd-seuil")}
                  type="number"
                  min={1}
                  disabled={disabled}
                  value={jd.declencheA}
                  onChange={(e) => maj({ jeuDecisif: { ...jd, declencheA: nombre(e.target.value) } })}
                />
              </Champ>
              <Champ id={id("jd-points")} label="Points du tie-break">
                <Input
                  id={id("jd-points")}
                  type="number"
                  min={2}
                  disabled={disabled}
                  value={jd.points}
                  onChange={(e) => maj({ jeuDecisif: { ...jd, points: nombre(e.target.value) } })}
                />
              </Champ>
              <Champ id={id("jd-ecart")} label="Écart (points)">
                <Input
                  id={id("jd-ecart")}
                  type="number"
                  min={1}
                  disabled={disabled}
                  value={jd.ecart}
                  onChange={(e) => maj({ jeuDecisif: { ...jd, ecart: nombre(e.target.value) } })}
                />
              </Champ>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-3 rounded-md border p-3">
        <Interrupteur
          id={id("st")}
          label={
            value.nbSetsGagnants === 1
              ? "Match joué en super tie-break seul"
              : "Set décisif joué en super tie-break"
          }
          checked={value.setDecisifSuperTiebreak}
          disabled={disabled}
          onChange={(v) => maj({ setDecisifSuperTiebreak: v, superTiebreakPoints: v ? pointsST : undefined })}
        />
        {value.setDecisifSuperTiebreak ? (
          <div className="max-w-48">
            <Champ id={id("st-points")} label="Points du super tie-break">
              <Input
                id={id("st-points")}
                type="number"
                min={2}
                disabled={disabled}
                value={pointsST}
                onChange={(e) => maj({ superTiebreakPoints: nombre(e.target.value) })}
              />
            </Champ>
          </div>
        ) : null}
      </div>

      <div className="space-y-3 rounded-md border p-3">
        <Interrupteur
          id={id("limite")}
          label="Limite de temps"
          checked={value.limiteTempsMin !== null}
          disabled={disabled}
          onChange={(v) =>
            maj({
              limiteTempsMin: v ? (value.dureeEstimeeMin || 25) : null,
              regleFinDeTemps: v && value.regleFinDeTemps === "aucune" ? "leader_gagne" : value.regleFinDeTemps,
            })
          }
        />
        {value.limiteTempsMin !== null ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Champ id={id("limite-min")} label="Durée maximale (min)">
              <Input
                id={id("limite-min")}
                type="number"
                min={1}
                disabled={disabled}
                value={value.limiteTempsMin}
                onChange={(e) => maj({ limiteTempsMin: nombre(e.target.value) })}
              />
            </Champ>
            <Champ id={id("egalite")} label="Égalité au buzzer (ex. 4-4)">
              <select
                id={id("egalite")}
                className={selectClasse}
                disabled={disabled}
                value={value.egaliteAuBuzzer ?? "point_en_or"}
                onChange={(e) => maj({ egaliteAuBuzzer: e.target.value as MatchFormat["egaliteAuBuzzer"] })}
              >
                <option value="point_en_or">Point en or (un dernier point décide)</option>
                <option value="jeu_decisif">Jeu décisif (un tie-break décide)</option>
                <option value="nul_interdit">Nul interdit (le scoreur désigne le vainqueur)</option>
              </select>
            </Champ>
            <Champ id={id("regle")} label="À la fin du temps">
              <select
                id={id("regle")}
                className={selectClasse}
                disabled={disabled}
                value={value.regleFinDeTemps}
                onChange={(e) => maj({ regleFinDeTemps: e.target.value as MatchFormat["regleFinDeTemps"] })}
              >
                <option value="aucune">— Choisir une règle —</option>
                <option value="leader_gagne">Le leader gagne</option>
                <option value="finir_le_jeu">On termine le jeu en cours</option>
              </select>
            </Champ>
          </div>
        ) : null}
      </div>

      <div className="max-w-48">
        <Champ id={id("duree")} label="Durée estimée (min)">
          <Input
            id={id("duree")}
            type="number"
            min={1}
            disabled={disabled}
            value={value.dureeEstimeeMin}
            onChange={(e) => maj({ dureeEstimeeMin: nombre(e.target.value) })}
          />
        </Champ>
      </div>
    </div>
  );
}
