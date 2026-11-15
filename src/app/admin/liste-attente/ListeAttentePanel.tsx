"use client";

import { useState, useTransition } from "react";
import { envoyerMessageListeAttente, purgerAnciennesInscriptions, supprimerDeLaListe } from "./actions";
import { libelleNiveau, NIVEAUX_LISTE_ATTENTE } from "@/lib/liste-attente/niveaux";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

export interface Inscrit {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  niveau: string;
  ville: string | null;
  inscritLe: string;
  notifieLe: string | null;
}

type Bilan = { ok: boolean; texte: string; erreurs: string[] };

const zoneTexte =
  "min-h-64 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const jour = (iso: string) => new Date(iso).toLocaleDateString("fr-FR");

export function ListeAttentePanel({
  inscrits,
  modele,
  nbAnciens,
  dureeMois,
}: {
  inscrits: Inscrit[];
  modele: { sujet: string; texte: string };
  nbAnciens: number;
  dureeMois: number;
}) {
  const [sujet, setSujet] = useState(modele.sujet);
  const [texte, setTexte] = useState(modele.texte);
  // Par défaut : les personnes pas encore prévenues, pour ne pas renvoyer l'annonce à tout le monde.
  const [choisis, setChoisis] = useState<Set<string>>(() => new Set(inscrits.filter((i) => !i.notifieLe).map((i) => i.id)));
  const [confirmation, setConfirmation] = useState(false);
  const [bilan, setBilan] = useState<Bilan | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  const parNiveau = NIVEAUX_LISTE_ATTENTE.map((n) => ({ ...n, nb: inscrits.filter((i) => i.niveau === n.code).length }));

  function choisir(ids: string[]) {
    setConfirmation(false);
    setChoisis(new Set(ids));
  }

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
      const r = await envoyerMessageListeAttente({ sujet, texte, ids: essai ? [] : [...choisis], essai });
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

  function retirer(i: Inscrit) {
    if (!window.confirm(`Retirer ${i.prenom} ${i.nom} de la liste ? Ses données seront supprimées.`)) return;
    demarrer(async () => {
      const r = await supprimerDeLaListe(i.id);
      setInfo("error" in r ? r.error : null);
      if (!("error" in r)) setChoisis((a) => new Set([...a].filter((x) => x !== i.id)));
    });
  }

  function purger() {
    if (!window.confirm(`Supprimer définitivement les ${nbAnciens} inscription(s) de plus de ${dureeMois} mois ?`)) return;
    demarrer(async () => {
      const r = await purgerAnciennesInscriptions();
      setInfo("error" in r ? r.error : (r.message ?? null));
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">
            {inscrits.length} personne{inscrits.length > 1 ? "s" : ""} sur la liste
          </CardTitle>
          <a href="/admin/liste-attente/export" className="text-sm underline">
            Exporter en CSV
          </a>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {parNiveau.map((n) => (
              <Badge key={n.code} variant="outline">
                {n.libelle} : {n.nb}
              </Badge>
            ))}
          </div>
          {nbAnciens > 0 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
              <span className="flex-1">
                {nbAnciens} inscription(s) dépassent les {dureeMois} mois de conservation annoncés aux inscrits.
              </span>
              <Button size="sm" variant="outline" disabled={enCours} onClick={purger}>
                Les supprimer
              </Button>
            </div>
          ) : null}
          {info ? <p className="text-sm">{info}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Message d&apos;annonce</CardTitle>
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
            <textarea id="texte" className={zoneTexte} value={texte} onChange={(e) => setTexte(e.target.value)} maxLength={5000} />
            <p className="text-xs text-muted-foreground">
              <code>{"{prenom}"}</code> et <code>{"{nom}"}</code> sont remplacés pour chaque personne. Remplace les « [à
              compléter] » (date, lieu, lien d&apos;inscription) avant d&apos;envoyer. Un lien de désinscription personnel
              est ajouté automatiquement en bas de chaque message.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Destinataires ({choisis.size} / {inscrits.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {inscrits.length === 0 ? (
            <p className="text-sm text-muted-foreground">Personne n&apos;est inscrit pour l&apos;instant.</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => choisir(inscrits.map((i) => i.id))}>
                  Tout sélectionner
                </Button>
                <Button size="sm" variant="outline" onClick={() => choisir(inscrits.filter((i) => !i.notifieLe).map((i) => i.id))}>
                  Pas encore prévenus
                </Button>
                <Button size="sm" variant="outline" onClick={() => choisir([])}>
                  Tout désélectionner
                </Button>
              </div>
              <ul className="divide-y rounded-lg border">
                {inscrits.map((i) => (
                  <li key={i.id} className="flex items-center gap-3 p-3 text-sm">
                    <Checkbox checked={choisis.has(i.id)} onCheckedChange={(c) => basculer(i.id, c === true)} aria-label={`${i.prenom} ${i.nom}`} />
                    <span className="min-w-0 flex-1">
                      <span className="font-medium">
                        {i.prenom} {i.nom}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {i.email} · {i.telephone}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {libelleNiveau(i.niveau)}
                        {i.ville ? ` · ${i.ville}` : ""} · inscrit(e) le {jour(i.inscritLe)}
                        {i.notifieLe ? ` · prévenu(e) le ${jour(i.notifieLe)}` : ""}
                      </span>
                    </span>
                    <Button size="sm" variant="ghost" disabled={enCours} onClick={() => retirer(i)}>
                      Retirer
                    </Button>
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
              Envoyer à {choisis.size} personne(s)
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          100 personnes au plus par envoi. Les personnes prévenues sont marquées : « Pas encore prévenus » évite de leur
          renvoyer l&apos;annonce.
        </p>
      </div>
    </div>
  );
}
