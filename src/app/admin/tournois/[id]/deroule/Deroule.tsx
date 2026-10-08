"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { flushSync } from "react-dom";
import type { MatchFormat } from "@/lib/engine/types";
import {
  deduireAutreCamp,
  egalitePossibleEnPoints,
  verifierSaisiePoints,
  type SetSaisi,
} from "@/lib/engine/score";
import type { Deroule as DonneesDeroule, MancheAffichee } from "@/lib/tournoi/deroule";
import { nomCourt } from "@/lib/tournoi/deroule";
import { cn } from "@/lib/utils";

export type ResultatAction = { error: string } | { success: true };

export interface LigneJoueurAffichee {
  rang: number | null;
  nomAffiche: string;
  manchesJouees: number;
  victoires: number;
  pointsMarques: number;
  difference: number;
  toursExempt: number;
  pointsParManche: number;
}

export interface DerouleProps {
  tournamentId: string;
  deroule: DonneesDeroule;
  format: MatchFormat;
  classement: LigneJoueurAffichee[];
  parManche: boolean;
  termine: boolean;
  /** Actions injectées : saisie + validation en un appel, correction, clôture. */
  validerManche: (matchId: string, sets: SetSaisi[]) => Promise<ResultatAction>;
  corrigerManche: (matchId: string, sets: SetSaisi[]) => Promise<ResultatAction>;
  terminer: () => Promise<ResultatAction>;
}

const heure = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }) : null;

/** Un camp : deux joueurs, en gros, et son score à droite. */
function Camp({
  joueurs,
  gagnant,
  perdant,
  children,
}: {
  joueurs: string[];
  gagnant: boolean;
  perdant: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3 rounded-lg px-3 py-3", gagnant && "bg-primary/10", perdant && "opacity-70")}>
      <div className="min-w-0 text-xl leading-tight font-semibold">
        {joueurs.map((j) => (
          <div key={j} className="truncate">
            {nomCourt(j)}
          </div>
        ))}
      </div>
      {children}
    </div>
  );
}

function MancheCarte({
  manche,
  format,
  onValider,
  onCorriger,
  inputRef,
  apres,
}: {
  manche: MancheAffichee;
  format: MatchFormat;
  onValider: DerouleProps["validerManche"];
  onCorriger: DerouleProps["corrigerManche"];
  inputRef: (el: HTMLInputElement | null) => void;
  apres: () => void;
}) {
  const exact = format.sommeExacte !== false;
  const [camp, setCamp] = useState<"a" | "b">("a");
  const [saisie, setSaisie] = useState("");
  const [autre, setAutre] = useState("");
  const [correction, setCorrection] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const champRef = useRef<HTMLInputElement | null>(null);

  const saisi = saisie === "" ? null : Number(saisie);
  const deduit = exact ? (saisi === null ? null : deduireAutreCamp(saisi, format)) : autre === "" ? null : Number(autre);
  const pA = camp === "a" ? saisi : deduit;
  const pB = camp === "a" ? deduit : saisi;
  const complet = pA !== null && pB !== null;
  const egalite = complet && pA === pB;
  const pointEnOr = exact && egalite && egalitePossibleEnPoints(format);
  const depasse = exact && saisi !== null && deduit === null;

  const envoyer = (gagnantPointEnOr?: "a" | "b") => {
    if (!complet) return;
    const sets: SetSaisi[] = [
      {
        jeuxA: pA,
        jeuxB: pB,
        tiebreakA: gagnantPointEnOr ? (gagnantPointEnOr === "a" ? 1 : 0) : null,
        tiebreakB: gagnantPointEnOr ? (gagnantPointEnOr === "a" ? 0 : 1) : null,
      },
    ];
    const probleme = verifierSaisiePoints(sets, format);
    if (probleme) return setErreur(probleme);
    setErreur(null);
    // Le curseur passe à la manche suivante TOUT DE SUITE, pendant le geste de l'utilisateur :
    // sur iOS, un focus donné plus tard (après l'attente du serveur) ne rouvre pas le clavier.
    const etaitTerminee = manche.termine;
    if (!etaitTerminee) apres();
    demarrer(async () => {
      const r = await (etaitTerminee ? onCorriger : onValider)(manche.id, sets);
      if ("error" in r) {
        setErreur(r.error);
        champRef.current?.focus();
        return;
      }
      setSaisie("");
      setAutre("");
      setCorrection(false);
      apres();
    });
  };

  const entete = (
    <div className="flex items-baseline justify-between text-sm text-muted-foreground">
      <span className="font-medium text-foreground">{manche.terrain}</span>
      <span>{heure(manche.debut)}</span>
    </div>
  );

  if (manche.termine && !correction) {
    return (
      <section className="space-y-2 rounded-xl border bg-card p-3" data-testid={`manche-${manche.id}`} data-etat="validee">
        {entete}
        <Camp joueurs={manche.equipeA} gagnant={manche.vainqueur === "a"} perdant={manche.vainqueur === "b"}>
          <span className="text-3xl font-bold tabular-nums">{manche.pointsA ?? "–"}</span>
        </Camp>
        <Camp joueurs={manche.equipeB} gagnant={manche.vainqueur === "b"} perdant={manche.vainqueur === "a"}>
          <span className="text-3xl font-bold tabular-nums">{manche.pointsB ?? "–"}</span>
        </Camp>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {manche.statut === "forfait" ? "Forfait" : manche.vainqueur ? "Validée" : "Validée · match nul"}
          </span>
          <button type="button" className="min-h-10 px-2 text-primary underline" onClick={() => setCorrection(true)}>
            Corriger
          </button>
        </div>
      </section>
    );
  }

  const champ = (valeur: string, changer: (v: string) => void, id: string, ref?: (el: HTMLInputElement | null) => void) => (
    <input
      id={id}
      ref={(el) => {
        ref?.(el);
        if (ref) champRef.current = el;
      }}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      enterKeyHint="go"
      autoComplete="off"
      maxLength={3}
      value={valeur}
      onChange={(e) => changer(e.target.value.replace(/\D/g, ""))}
      aria-label={`Points ${camp === "a" ? "du premier" : "du second"} camp`}
      className="h-14 w-24 rounded-lg border-2 bg-background text-center text-3xl font-bold tabular-nums"
    />
  );

  const affichageDeduit = (valeur: number | null) => (
    <span className="flex h-14 w-24 items-center justify-center text-3xl font-bold text-muted-foreground tabular-nums" aria-live="polite">
      {valeur ?? "–"}
    </span>
  );

  const surA = camp === "a";

  return (
    <form
      className="space-y-2 rounded-xl border bg-card p-3"
      data-testid={`manche-${manche.id}`}
      data-etat={correction ? "correction" : "a_saisir"}
      onSubmit={(e) => {
        e.preventDefault();
        if (!pointEnOr) envoyer();
      }}
    >
      {entete}
      <Camp joueurs={manche.equipeA} gagnant={false} perdant={false}>
        {surA || !exact
          ? champ(surA ? saisie : autre, surA ? setSaisie : setAutre, `${manche.id}-a`, surA ? inputRef : undefined)
          : affichageDeduit(pA)}
      </Camp>
      <Camp joueurs={manche.equipeB} gagnant={false} perdant={false}>
        {!surA || !exact
          ? champ(!surA ? saisie : autre, !surA ? setSaisie : setAutre, `${manche.id}-b`, !surA ? inputRef : undefined)
          : affichageDeduit(pB)}
      </Camp>

      {depasse ? (
        <p className="text-sm text-destructive">Le total de la manche est de {format.pointsCible} points.</p>
      ) : null}
      {erreur ? <p className="text-sm text-destructive">{erreur}</p> : null}

      {pointEnOr ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Égalité {pA}-{pB} : qui a gagné le point en or ?</p>
          <div className="grid grid-cols-2 gap-2">
            {(["a", "b"] as const).map((g) => (
              <button
                key={g}
                type="button"
                disabled={enCours}
                onClick={() => envoyer(g)}
                className="h-14 rounded-lg bg-primary text-base font-semibold text-primary-foreground disabled:opacity-50"
              >
                {(g === "a" ? manche.equipeA : manche.equipeB).map(nomCourt).join(" / ")}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button
          type="submit"
          disabled={!complet || enCours}
          className="h-14 w-full rounded-lg bg-primary text-lg font-semibold text-primary-foreground disabled:opacity-40"
        >
          {enCours ? "Validation…" : correction ? "Valider la correction" : "Valider"}
        </button>
      )}

      <div className="flex justify-between text-sm">
        {exact ? (
          <button type="button" className="min-h-10 px-1 text-muted-foreground underline" onClick={() => { setCamp(surA ? "b" : "a"); setSaisie(""); }}>
            Saisir le score de l&apos;autre camp
          </button>
        ) : (
          <span />
        )}
        {correction ? (
          <button type="button" className="min-h-10 px-1 text-muted-foreground underline" onClick={() => setCorrection(false)}>
            Annuler
          </button>
        ) : null}
      </div>
    </form>
  );
}

export function Deroule({ deroule, format, classement, parManche, termine, validerManche, corrigerManche, terminer }: DerouleProps) {
  const { tours } = deroule;
  const [numero, setNumero] = useState(deroule.tourCourant);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const champs = useRef(new Map<string, HTMLInputElement>());

  const tour = tours.find((t) => t.numero === numero) ?? tours[0];
  const premiereASaisir = tour?.manches.find((m) => !m.termine)?.id;

  // À l'ouverture d'un tour, le curseur est déjà dans la première manche à saisir : le clavier
  // numérique est prêt, aucun geste n'est nécessaire pour atteindre le champ.
  useEffect(() => {
    if (premiereASaisir) champs.current.get(premiereASaisir)?.focus({ preventScroll: true });
  }, [numero, premiereASaisir]);

  if (!tour) return <p className="p-4 text-sm text-muted-foreground">Aucune manche générée.</p>;

  const index = tours.findIndex((t) => t.numero === tour.numero);
  const validees = tour.manches.filter((m) => m.termine).length;
  const dernier = index === tours.length - 1;
  const debloque = tour.termine;

  // Après une validation, le clavier passe tout seul à la manche suivante à saisir.
  const focaliserSuivante = (idCourant: string) => {
    const suivante = tour.manches.find((m) => !m.termine && m.id !== idCourant);
    if (suivante) champs.current.get(suivante.id)?.focus({ preventScroll: false });
  };

  // Changement de tour : rendu immédiat puis curseur dans la première manche à saisir, dans le
  // même geste (le clavier numérique reste ouvert).
  const allerAuTour = (cible: number) => {
    flushSync(() => setNumero(cible));
    const premiere = tours.find((t) => t.numero === cible)?.manches.find((m) => !m.termine);
    if (premiere) champs.current.get(premiere.id)?.focus({ preventScroll: true });
  };

  return (
    <div className="mx-auto w-full max-w-md space-y-4 p-3 pb-24">
      <header className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-bold">
            Tour {tour.numero} sur {tours.length}
          </h1>
          <span className="text-sm text-muted-foreground" data-testid="progression-tour">
            {validees}/{tour.manches.length} manches validées
          </span>
        </div>
        <ol className="flex gap-1" aria-label="Progression des tours">
          {tours.map((t, i) => {
            const accessible = i <= index || tours.slice(0, i).every((x) => x.termine);
            return (
              <li key={t.numero} className="flex-1">
                <button
                  type="button"
                  disabled={!accessible}
                  onClick={() => allerAuTour(t.numero)}
                  aria-label={`Tour ${t.numero}${t.termine ? " (terminé)" : ""}`}
                  aria-current={t.numero === tour.numero ? "step" : undefined}
                  className={cn(
                    "h-3 w-full rounded-full",
                    t.termine ? "bg-primary" : t.numero === tour.numero ? "bg-primary/40" : "bg-muted",
                    t.numero === tour.numero && "ring-2 ring-primary ring-offset-1",
                  )}
                />
              </li>
            );
          })}
        </ol>
      </header>

      <div className="space-y-3">
        {tour.manches.map((m) => (
          <MancheCarte
            key={m.id}
            manche={m}
            format={format}
            onValider={validerManche}
            onCorriger={corrigerManche}
            inputRef={(el) => {
              if (el) champs.current.set(m.id, el);
              else champs.current.delete(m.id);
            }}
            apres={() => focaliserSuivante(m.id)}
          />
        ))}
      </div>

      {tour.exemptes.length > 0 ? (
        <section className="rounded-xl border border-dashed p-3" data-testid="exemptes">
          <h2 className="text-sm font-medium text-muted-foreground">Au repos ce tour</h2>
          <p className="mt-1 text-lg font-semibold">{tour.exemptes.join(", ")}</p>
        </section>
      ) : null}

      <details className="rounded-xl border bg-card" data-testid="classement-direct">
        <summary className="min-h-12 cursor-pointer px-3 py-3 text-base font-semibold">Classement en direct</summary>
        <div className="overflow-x-auto px-1 pb-3">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-2 py-1">#</th>
                <th className="px-2 py-1">Joueur</th>
                <th className="px-2 py-1 text-right">{parManche ? "Pts/manche" : "Pts"}</th>
                <th className="px-2 py-1 text-right">Diff</th>
                <th className="px-2 py-1 text-right">V</th>
                <th className="px-2 py-1 text-right">M</th>
              </tr>
            </thead>
            <tbody>
              {classement.map((l) => (
                <tr key={l.nomAffiche} className="border-t">
                  <td className="px-2 py-1.5 font-semibold">{l.rang ?? "–"}</td>
                  <td className="px-2 py-1.5">{nomCourt(l.nomAffiche)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{parManche ? l.pointsParManche : l.pointsMarques}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{l.difference > 0 ? `+${l.difference}` : l.difference}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{l.victoires}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{l.manchesJouees}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {erreur ? <p className="text-sm text-destructive">{erreur}</p> : null}

      <div className="fixed inset-x-0 bottom-0 border-t bg-background/95 p-3 backdrop-blur">
        <div className="mx-auto flex max-w-md gap-2">
          {index > 0 ? (
            <button type="button" className="h-14 rounded-lg border px-4 text-base" onClick={() => allerAuTour(tours[index - 1].numero)}>
              ←
            </button>
          ) : null}
          {dernier ? (
            termine ? (
              <p className="flex h-14 flex-1 items-center justify-center rounded-lg bg-muted text-base font-semibold">Tournoi terminé</p>
            ) : (
              <button
                type="button"
                disabled={!debloque || enCours}
                onClick={() =>
                  demarrer(async () => {
                    const r = await terminer();
                    setErreur("error" in r ? r.error : null);
                  })
                }
                className="h-14 flex-1 rounded-lg bg-primary text-lg font-semibold text-primary-foreground disabled:opacity-40"
              >
                {debloque ? "Terminer le tournoi" : `Valide les ${tour.manches.length - validees} manche(s) restante(s)`}
              </button>
            )
          ) : (
            <button
              type="button"
              disabled={!debloque}
              onClick={() => allerAuTour(tours[index + 1].numero)}
              className="h-14 flex-1 rounded-lg bg-primary text-lg font-semibold text-primary-foreground disabled:opacity-40"
              data-testid="tour-suivant"
            >
              {debloque ? `Tour ${tours[index + 1].numero} →` : `Valide les ${tour.manches.length - validees} manche(s) restante(s)`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
