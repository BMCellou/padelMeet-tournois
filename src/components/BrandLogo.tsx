import Link from "next/link";

/**
 * Marque affichée dans le bandeau marine (accueil, admin, espace
 * participant) : la puce "P" reste en Volt sur fond Navy pour rester
 * visible quel que soit le fond derrière le lien.
 */
export function BrandLogo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-heading text-lg tracking-wide">
      <span className="flex size-7 items-center justify-center rounded-md bg-volt text-sm text-volt-foreground">
        P
      </span>
      <span>
        PadelMeet <span className="text-primary-foreground/60">Tournois</span>
      </span>
    </Link>
  );
}
