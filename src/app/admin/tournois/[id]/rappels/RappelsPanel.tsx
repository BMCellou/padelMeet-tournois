"use client";

import { useState, useTransition } from "react";
import {
  envoyerRappelAction,
  envoyerRappelsEnAttenteAction,
  marquerWhatsAppLienEnvoye,
  modifierContactJoueur,
  modifierParametresRappels,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { JoueurRappel, MatchRappel, ParametresRappels } from "@/lib/rappels/service";
import type { CanalRappel } from "@/lib/rappels/contact";

type ModeWhatsApp = "lien" | "api";

const selectClasse = "h-8 rounded-md border bg-background px-2 text-sm";

function formaterQuand(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function LigneJoueur({
  tournamentId,
  matchId,
  joueur,
  modeWhatsApp,
}: {
  tournamentId: string;
  matchId: string;
  joueur: JoueurRappel;
  modeWhatsApp: ModeWhatsApp;
}) {
  const [canal, setCanal] = useState<CanalRappel>(joueur.canal);
  const [valeur, setValeur] = useState(
    (joueur.canal === "email" ? joueur.email : joueur.telephone) ?? "",
  );
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const valeurEnregistree = (joueur.canal === "email" ? joueur.email : joueur.telephone) ?? "";
  const modifie = canal !== joueur.canal || valeur !== valeurEnregistree;

  function changerCanal(nouveau: CanalRappel) {
    setCanal(nouveau);
    setValeur((nouveau === "email" ? joueur.email : joueur.telephone) ?? "");
  }

  function executer(action: () => Promise<{ error: string } | { success: true }>, ok: string) {
    setMessage(null);
    startTransition(async () => {
      const r = await action();
      setMessage("error" in r ? { ok: false, texte: r.error } : { ok: true, texte: ok });
    });
  }

  function envoyer() {
    if (canal === "email") {
      executer(() => envoyerRappelAction(tournamentId, matchId, joueur.playerId, "email"), "E-mail envoyé.");
    } else if (modeWhatsApp === "api") {
      executer(
        () => envoyerRappelAction(tournamentId, matchId, joueur.playerId, "whatsapp_api"),
        "WhatsApp envoyé.",
      );
    } else if (joueur.lienWhatsApp) {
      window.open(joueur.lienWhatsApp, "_blank", "noopener,noreferrer");
      executer(
        () => marquerWhatsAppLienEnvoye(tournamentId, matchId, joueur.playerId),
        "Marqué comme envoyé.",
      );
    }
  }

  const lienIndisponible = canal === "whatsapp" && modeWhatsApp === "lien" && !joueur.lienWhatsApp;

  return (
    <li className="space-y-1 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-32 text-sm font-medium">
          {joueur.prenom} {joueur.nom}
        </span>
        <select
          className={selectClasse}
          value={canal}
          onChange={(e) => changerCanal(e.target.value as CanalRappel)}
          aria-label="Canal"
        >
          <option value="email">E-mail</option>
          <option value="whatsapp">WhatsApp</option>
        </select>
        <Input
          className="h-8 w-56"
          value={valeur}
          onChange={(e) => setValeur(e.target.value)}
          placeholder={canal === "email" ? "adresse e-mail" : "06 12 34 56 78"}
          aria-label="Contact"
        />
        {modifie ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() =>
              executer(() => modifierContactJoueur(tournamentId, joueur.playerId, canal, valeur), "Enregistré.")
            }
          >
            Enregistrer
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            disabled={isPending || lienIndisponible}
            onClick={envoyer}
            title={lienIndisponible ? "Numéro manquant ou invalide" : undefined}
          >
            {joueur.deja ? "Renvoyer" : canal === "whatsapp" && modeWhatsApp === "lien" ? "Ouvrir WhatsApp" : "Envoyer"}
          </Button>
        )}
        {joueur.deja ? (
          <Badge variant="secondary">
            Envoyé ({joueur.deja.canal === "email" ? "e-mail" : "WhatsApp"}, {joueur.deja.par}) ·{" "}
            {formaterQuand(joueur.deja.envoyeAt)}
          </Badge>
        ) : null}
      </div>
      {message ? (
        <p className={message.ok ? "text-xs text-primary" : "text-xs text-destructive"}>{message.texte}</p>
      ) : null}
    </li>
  );
}

export function RappelsPanel({
  tournamentId,
  matchs,
  parametres,
}: {
  tournamentId: string;
  matchs: MatchRappel[];
  parametres: ParametresRappels;
}) {
  const [modeWhatsApp, setModeWhatsApp] = useState<ModeWhatsApp>("lien");
  const [delai, setDelai] = useState(parametres.delaiAvantHeures);
  const [cronActif, setCronActif] = useState(parametres.cronActif);
  const [retour, setRetour] = useState<{ ok: boolean; texte: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function lancer(action: () => Promise<{ error: string } | { success: true; message?: string }>) {
    setRetour(null);
    startTransition(async () => {
      const r = await action();
      setRetour("error" in r ? { ok: false, texte: r.error } : { ok: true, texte: r.message ?? "Enregistré." });
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Envoi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label htmlFor="modeWa" className="font-medium">
              Méthode WhatsApp
            </label>
            <select
              id="modeWa"
              className={selectClasse}
              value={modeWhatsApp}
              onChange={(e) => setModeWhatsApp(e.target.value as ModeWhatsApp)}
            >
              <option value="lien">Lien (j&apos;envoie moi-même depuis WhatsApp)</option>
              <option value="api">API (envoi automatique)</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span>Prévenir tous les joueurs pas encore rappelés des matchs des</span>
            <Input
              type="number"
              min={1}
              max={72}
              className="h-8 w-20"
              value={delai}
              onChange={(e) => setDelai(Number(e.target.value))}
              aria-label="Délai en heures"
            />
            <span>prochaines heures</span>
            <Button
              type="button"
              disabled={isPending}
              onClick={() => lancer(() => envoyerRappelsEnAttenteAction(tournamentId, delai))}
            >
              Envoyer les rappels
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            L&apos;envoi groupé utilise le canal choisi pour chaque joueur ; WhatsApp y passe toujours par
            l&apos;API.
          </p>

          <div className="space-y-2 border-t pt-4">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <input
                id="cronActif"
                type="checkbox"
                className="size-4"
                checked={cronActif}
                onChange={(e) => setCronActif(e.target.checked)}
              />
              <label htmlFor="cronActif">Envoi automatique (cron) activé</label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() => lancer(() => modifierParametresRappels(tournamentId, cronActif, delai))}
              >
                Enregistrer
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Réglage global (tous les tournois). Le cron envoie e-mails et WhatsApp (API) aux matchs des{" "}
              {parametres.delaiAvantHeures} prochaines heures, une seule fois par joueur et par match.
            </p>
          </div>

          {retour ? (
            <p className={retour.ok ? "text-sm text-primary" : "text-sm text-destructive"}>{retour.texte}</p>
          ) : null}
        </CardContent>
      </Card>

      {matchs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucun match à venir avec un horaire. Génère d&apos;abord le calendrier.
        </p>
      ) : (
        matchs.map((m) => (
          <Card key={m.id}>
            <CardHeader>
              <CardTitle className="text-base">
                {formaterQuand(m.scheduledAt)}
                {m.terrain ? ` · ${m.terrain}` : ""} — {m.teamANom} vs {m.teamBNom}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {[...m.joueursA, ...m.joueursB].map((j) => (
                  <LigneJoueur
                    key={j.playerId}
                    tournamentId={tournamentId}
                    matchId={m.id}
                    joueur={j}
                    modeWhatsApp={modeWhatsApp}
                  />
                ))}
              </ul>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
