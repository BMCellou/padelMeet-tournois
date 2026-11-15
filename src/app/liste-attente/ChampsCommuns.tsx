import { NIVEAUX_LISTE_ATTENTE } from "@/lib/liste-attente/niveaux";
import { LIBELLE_CONSENTEMENT, type SectionRgpd } from "@/lib/liste-attente/rgpd";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Champs partagés par le formulaire public et l'inscription en un clic d'une personne connectée.

export function ChampNiveau() {
  return (
    <div className="space-y-1">
      <Label htmlFor="niveau">Ton niveau (de 1 à 8)</Label>
      <select
        id="niveau"
        name="niveau"
        required
        defaultValue=""
        className="h-9 w-full rounded-md border bg-background px-2 text-sm"
      >
        <option value="" disabled>
          Choisir…
        </option>
        {NIVEAUX_LISTE_ATTENTE.map((n) => (
          <option key={n.niveau} value={n.niveau}>
            {n.niveau} – {n.libelle} : {n.aide}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ChampVille() {
  return (
    <div className="space-y-1">
      <Label htmlFor="ville">
        Ville <span className="font-normal text-muted-foreground">(facultatif)</span>
      </Label>
      <Input id="ville" name="ville" autoComplete="address-level2" maxLength={80} />
      <p className="text-xs text-muted-foreground">
        Pour te prévenir en priorité si le tournoi a lieu près de chez toi. Tu peux la laisser vide.
      </p>
    </div>
  );
}

export function BlocConsentement({ rgpd }: { rgpd: SectionRgpd[] }) {
  return (
    <>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="consentement" className="mt-1" required />
        <span>{LIBELLE_CONSENTEMENT}</span>
      </label>

      <details className="rounded-lg border bg-muted/30 p-3 text-sm">
        <summary className="cursor-pointer font-medium">Comment tes données sont utilisées</summary>
        <dl className="mt-3 space-y-2">
          {rgpd.map((s) => (
            <div key={s.titre}>
              <dt className="font-medium">{s.titre}</dt>
              <dd className="text-muted-foreground">{s.texte}</dd>
            </div>
          ))}
        </dl>
      </details>
    </>
  );
}
