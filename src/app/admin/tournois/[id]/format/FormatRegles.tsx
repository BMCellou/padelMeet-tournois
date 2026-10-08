"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MatchFormat } from "@/lib/engine/types";
import type { CritereDepartage } from "@/lib/engine/classement";
import {
  avertissementsDepartage,
  memeFormat,
  resumerFormat,
  validerFormat,
} from "@/lib/engine/formatMatch";
import {
  LIBELLES_PHASES,
  PHASES_FORMAT,
  type FormatsParPhase,
  type PhaseFormat,
  type Verrous,
} from "@/lib/engine/formatPhases";
import { FormatEditor } from "./FormatEditor";
import { DepartageEditor } from "./DepartageEditor";
import { enregistrerDepartage, enregistrerFormatDefaut, enregistrerFormatsParPhase } from "./actions";

type Retour = { ok: boolean; texte: string } | null;

function Verrouille({ raison }: { raison: string | null }) {
  if (!raison) return null;
  return (
    <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-sm">
      🔒 Verrouillé : {raison}
    </p>
  );
}

function Message({ retour, modifie }: { retour: Retour; modifie: boolean }) {
  // Dès que le formulaire est modifié, l'ancien « Enregistré. » ne dit plus rien de vrai : on le remplace
  // par un rappel qu'il reste des changements à enregistrer.
  if (modifie) {
    return <p className="text-sm text-amber-600">Modifications non enregistrées.</p>;
  }
  if (!retour) return null;
  return <p className={retour.ok ? "text-sm text-primary" : "text-sm text-destructive"}>{retour.texte}</p>;
}

export function FormatRegles({
  tournamentId,
  formatDefaut,
  formatsParPhase,
  criteres,
  verrous,
}: {
  tournamentId: string;
  formatDefaut: MatchFormat;
  formatsParPhase: FormatsParPhase;
  criteres: CritereDepartage[];
  verrous: Verrous;
}) {
  const [defaut, setDefaut] = useState<MatchFormat>(formatDefaut);
  const [phases, setPhases] = useState<Record<PhaseFormat, MatchFormat | null>>(
    () => Object.fromEntries(PHASES_FORMAT.map((p) => [p, formatsParPhase[p] ?? null])) as Record<PhaseFormat, MatchFormat | null>,
  );
  const [actifs, setActifs] = useState<CritereDepartage[]>(criteres);
  const [retours, setRetours] = useState<Record<string, Retour>>({});
  // Dernier état connu en base : sert à repérer les modifications pas encore enregistrées.
  const [sauve, setSauve] = useState({ defaut: formatDefaut, phases: null as Record<PhaseFormat, MatchFormat | null> | null, actifs: criteres });
  const [isPending, startTransition] = useTransition();

  function lancer(
    cle: string,
    action: () => Promise<{ error: string } | { success: true; inchange?: true }>,
    apresSucces: () => void,
  ) {
    setRetours((r) => ({ ...r, [cle]: null }));
    startTransition(async () => {
      const res = await action();
      if (!("error" in res)) apresSucces();
      setRetours((r) => ({
        ...r,
        [cle]:
          "error" in res
            ? { ok: false, texte: res.error }
            : { ok: true, texte: res.inchange ? "Aucun changement à enregistrer." : "Enregistré." },
      }));
    });
  }

  const phasesSauvees = sauve.phases ?? (Object.fromEntries(PHASES_FORMAT.map((p) => [p, formatsParPhase[p] ?? null])) as Record<PhaseFormat, MatchFormat | null>);
  const defautModifie = !memeFormat(defaut, sauve.defaut);
  const phasesModifiees = PHASES_FORMAT.some((p) => !memeFormat(phases[p], phasesSauvees[p]));
  const departageModifie = JSON.stringify(actifs) !== JSON.stringify(sauve.actifs);
  const defautValide = validerFormat(defaut).ok;
  const phasesValides = PHASES_FORMAT.every((p) => !phases[p] || validerFormat(phases[p]).ok);
  const formatPoules = phases.poule ?? defaut;
  const avertissements = avertissementsDepartage(formatPoules, actifs);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Format de match par défaut</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Verrouille raison={verrous.defaut.raison} />
          <FormatEditor value={defaut} onChange={setDefaut} disabled={verrous.defaut.verrouille} idPrefix="defaut" />
          <Message retour={retours.defaut ?? null} modifie={defautModifie} />
          <Button
            type="button"
            disabled={isPending || verrous.defaut.verrouille || !defautValide}
            onClick={() =>
              lancer("defaut", () => enregistrerFormatDefaut(tournamentId, defaut), () => setSauve((x) => ({ ...x, defaut })))
            }
          >
            Enregistrer le format par défaut
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">2. Format par phase</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Chaque phase suit le format par défaut, sauf si elle a son propre format. Ces réglages
            s&apos;appliquent aux matchs pas encore commencés, y compris ceux qui seront générés plus tard
            (tableau final).
          </p>
          <ul className="divide-y rounded-md border">
            {PHASES_FORMAT.map((p) => {
              const verrou = verrous.phases[p];
              const propre = phases[p];
              return (
                <li key={p} className="space-y-3 p-3">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <p className="w-48 text-sm font-medium">{LIBELLES_PHASES[p]}</p>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name={`phase-${p}`}
                        checked={!propre}
                        disabled={verrou.verrouille}
                        onChange={() => setPhases((s) => ({ ...s, [p]: null }))}
                      />
                      Identique au format par défaut
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name={`phase-${p}`}
                        checked={!!propre}
                        disabled={verrou.verrouille}
                        onChange={() => setPhases((s) => ({ ...s, [p]: s[p] ?? { ...defaut } }))}
                      />
                      Format propre
                    </label>
                  </div>
                  {verrou.verrouille ? <Verrouille raison={verrou.raison} /> : null}
                  {propre ? (
                    <FormatEditor
                      value={propre}
                      onChange={(f) => setPhases((s) => ({ ...s, [p]: f }))}
                      disabled={verrou.verrouille}
                      idPrefix={`phase-${p}`}
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground">{resumerFormat(defaut)}</p>
                  )}
                </li>
              );
            })}
          </ul>
          <Message retour={retours.phases ?? null} modifie={phasesModifiees} />
          <Button
            type="button"
            disabled={isPending || !phasesValides}
            onClick={() =>
              lancer(
                "phases",
                () =>
                  enregistrerFormatsParPhase(
                    tournamentId,
                    Object.fromEntries(PHASES_FORMAT.map((p) => [p, phases[p]])),
                  ),
                () => setSauve((x) => ({ ...x, phases })),
              )
            }
          >
            Enregistrer les formats par phase
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">3. Ordre de départage des poules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            En cas d&apos;égalité, les critères sont appliqués dans cet ordre ; un critère qui ne sépare
            personne est sauté.
          </p>
          <Verrouille raison={verrous.departage.raison} />
          <DepartageEditor actifs={actifs} onChange={setActifs} disabled={verrous.departage.verrouille} />
          {avertissements.length > 0 ? (
            <ul className="space-y-1 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              {avertissements.map((a) => (
                <li key={a}>⚠️ {a}</li>
              ))}
            </ul>
          ) : null}
          <Message retour={retours.departage ?? null} modifie={departageModifie} />
          <Button
            type="button"
            disabled={isPending || verrous.departage.verrouille}
            onClick={() =>
              lancer("departage", () => enregistrerDepartage(tournamentId, actifs), () => setSauve((x) => ({ ...x, actifs })))
            }
          >
            Enregistrer l&apos;ordre de départage
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
