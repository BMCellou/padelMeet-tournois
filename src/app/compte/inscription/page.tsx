"use client";

import { Suspense, useActionState, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { inscription } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default function InscriptionParticipantPage() {
  return (
    <Suspense fallback={null}>
      <FormulaireInscription />
    </Suspense>
  );
}

function FormulaireInscription() {
  const [state, formAction, isPending] = useActionState(inscription, null);
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/compte";
  const formRef = useRef<HTMLFormElement>(null);
  const [decision, setDecision] = useState<"" | "confirmer" | "ignorer">("");

  // Champs contrôlés : après l'appel de l'action serveur qui renvoie
  // l'écran de confirmation, React réinitialise le formulaire natif —
  // sans état React propre, prénom/nom/e-mail/mot de passe seraient
  // vidés avant même que la personne ait répondu "oui" ou "non".
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [sexe, setSexe] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const confirmation = state && "confirmation" in state ? state.confirmation : null;

  function repondre(reponse: "confirmer" | "ignorer") {
    setDecision(reponse);
    requestAnimationFrame(() => formRef.current?.requestSubmit());
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Créer mon compte joueur</CardTitle>
          <CardDescription>
            Pour t&apos;inscrire aux tournois et retrouver ton historique.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form ref={formRef} action={formAction} className="space-y-4">
            <input type="hidden" name="next" value={next} />
            <input
              type="hidden"
              name="ficheFantomeChoisie"
              value={decision === "confirmer" ? (confirmation?.ficheId ?? "") : ""}
            />
            <input type="hidden" name="ignorerFantome" value={decision === "ignorer" ? "1" : ""} />

            {confirmation ? (
              <div className="space-y-3 rounded-lg border bg-muted/40 p-3 text-sm">
                <p>
                  On a trouvé une inscription à cet e-mail au nom de{" "}
                  <strong>
                    {confirmation.prenom} {confirmation.nom}
                  </strong>
                  . C&apos;est toi ?
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    className="flex-1"
                    disabled={isPending}
                    onClick={() => repondre("confirmer")}
                  >
                    Oui, c&apos;est moi
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    disabled={isPending}
                    onClick={() => repondre("ignorer")}
                  >
                    Non, nouveau profil
                  </Button>
                </div>
              </div>
            ) : null}

            {/* Toujours montés (masqués pendant la confirmation), en
                champs contrôlés pour survivre à la réinitialisation
                automatique du formulaire entre les deux soumissions. */}
            <div hidden={!!confirmation} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="prenom">Prénom</Label>
                  <Input
                    id="prenom"
                    name="prenom"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    required={!confirmation}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="nom">Nom</Label>
                  <Input
                    id="nom"
                    name="nom"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    required={!confirmation}
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label htmlFor="sexe">Sexe (H/F)</Label>
                  <Input
                    id="sexe"
                    name="sexe"
                    value={sexe}
                    onChange={(e) => setSexe(e.target.value)}
                    maxLength={1}
                    placeholder="H"
                    className="max-w-24"
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <Label htmlFor="telephone">Téléphone</Label>
                  <Input
                    id="telephone"
                    name="telephone"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required={!confirmation}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={!confirmation}
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              {state && "error" in state ? (
                <p className="text-sm text-destructive">{state.error}</p>
              ) : null}
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Création..." : "Créer mon compte"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Déjà un compte ?{" "}
                <Link
                  href={`/compte/connexion?next=${encodeURIComponent(next)}`}
                  className="underline"
                >
                  Se connecter
                </Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
