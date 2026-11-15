import Link from "next/link";

/** Pied de page des pages publiques : accès aux mentions légales et à l'information sur les données. */
export function LiensLegaux() {
  return (
    <footer className="mx-auto flex w-full max-w-xl flex-wrap justify-center gap-x-4 gap-y-1 px-4 py-6 text-xs text-muted-foreground">
      <Link href="/mentions-legales" className="underline">
        Mentions légales
      </Link>
      <Link href="/mentions-legales#donnees" className="underline">
        Données personnelles
      </Link>
    </footer>
  );
}
