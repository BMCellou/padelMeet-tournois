"use client";

import { useState, useTransition } from "react";
import { envoyerMessageInscrits } from "./actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import type { Destinataire } from "@/lib/messages/inscrits";

type Bilan = { ok: boolean; texte: string; erreurs: string[] };

const zoneTexte =
  "min-h-64 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

export function MessagesPanel({
  tournamentId,
  modele,
  destinataires,
  planningDisponible,
}: {
  tournamentId: string;
  modele: { sujet: string; texte: string };
  destinataires: Destinataire[];
  planningDisponible: boolean;
}) {
  const joignables = destinataires.filter((d) => d.email);
  const [sujet, setSujet] = useState(modele.sujet);
  const [texte, setTexte] = useState(modele.texte);
  const [joindre, setJoindre] = useState(planningDisponible);
  const [choisis, setChoisis] = useState<Set<string>>(
    () => new Set(joignables.filter((d) => d.valide).map((d) => d.playerId)),
  );
  const [confirmation, setConfirmation] = useState(false);
  const [bilan, setBilan] = useState<Bilan | null>(null);
  const [enCours, demarrer] = useTransition();

  function basculer(id: string, coche: boolean) {
    setConfirmation(false);
    setChoisis((actuel) => {
      const suivant = new Set(actuel);
      if (coche) suivant.add(id);
      else suivant.delete(id);
      return suivant;
    });
  }

  function envoyer(essai: boolean) {
    setBilan(null);
    setConfirmation(false);
    demarrer(async () => {
      const r = await envoyerMessageInscrits({
        tournamentId,
        sujet,
        texte,
        playerIds: essai ? [] : [...choisis],
        joindrePlanning: joindre,
        essai,
      });
      if ("error" in r) {
        setBilan({ ok: false, texte: r.error, erreurs: [] });
        return;
      }
      const cible = r.essai ? "Essai envoyé à ton adresse" : `${r.envoyes} e-mail(s) envoyé(s)`;
      setBilan({
        ok: r.erreurs.length === 0,
        texte: r.erreurs.length === 0 ? `${cible}.` : `${cible}, ${r.erreurs.length} échec(s).`,
        erreurs: r.erreurs,
      });
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Message</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="sujet" className="text-sm font-medium">
              Sujet
            </label>
            <Input id="sujet" value={sujet} onChange={(e) => setSujet(e.target.value)} maxLength={150} />
          </div>
          <div className="space-y-1">
            <label htmlFor="texte" className="text-sm font-medium">
              Texte
            </label>
            <textarea
              id="texte"
              className={zoneTexte}
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              maxLength={5000}
            />
            <p className="text-xs text-muted-foreground">
              <code>{"{prenom}"}</code> et <code>{"{nom}"}</code> sont remplacés pour chaque destinataire. Remplace « [à
              compléter] » (code d&apos;accès au club) avant d&apos;envoyer.
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={joindre} onCheckedChange={(c) => setJoindre(c === true)} disabled={!planningDisponible} />
            Joindre le planning du déroulé (PDF)
          </label>
          {!planningDisponible ? (
            <p className="text-xs text-muted-foreground">
              Le calendrier n&apos;est pas encore généré : aucun planning à joindre.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Destinataires ({choisis.size} / {joignables.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {destinataires.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun inscrit pour l&apos;instant.</p>
          ) : (
            <>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setConfirmation(false);
                    setChoisis(new Set(joignables.map((d) => d.playerId)));
                  }}
                >
                  Tout sélectionner
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setConfirmation(false);
                    setChoisis(new Set());
                  }}
                >
                  Tout désélectionner
                </Button>
              </div>
              <ul className="divide-y rounded-lg border">
                {destinataires.map((d) => (
                  <li key={d.playerId} className="flex items-center gap-3 p-3 text-sm">
                    <Checkbox
                      checked={choisis.has(d.playerId)}
                      onCheckedChange={(c) => basculer(d.playerId, c === true)}
                      disabled={!d.email}
                      aria-label={`${d.prenom} ${d.nom}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">
                        {d.prenom} {d.nom}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {d.email ?? "pas d'e-mail valide"}
                      </span>
                    </span>
                    {!d.valide ? <Badge variant="outline">Non validé</Badge> : null}
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {bilan ? (
          <div className="space-y-1" role="status">
            <p className={bilan.ok ? "text-sm" : "text-sm text-destructive"}>{bilan.texte}</p>
            {bilan.erreurs.length > 0 ? (
              <ul className="list-disc space-y-0.5 pl-5 text-xs text-destructive">
                {bilan.erreurs.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={enCours} onClick={() => envoyer(true)}>
            {enCours ? "Envoi…" : "M'envoyer un essai"}
          </Button>
          {confirmation ? (
            <>
              <Button disabled={enCours} onClick={() => envoyer(false)}>
                Oui, envoyer à {choisis.size} personne(s)
              </Button>
              <Button variant="ghost" disabled={enCours} onClick={() => setConfirmation(false)}>
                Annuler
              </Button>
            </>
          ) : (
            <Button disabled={enCours || choisis.size === 0} onClick={() => setConfirmation(true)}>
              Envoyer aux {choisis.size} sélectionné(s)
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
