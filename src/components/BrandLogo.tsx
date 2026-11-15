import Link from "next/link";

/**
 * Marque affichée dans le bandeau marine (accueil, admin, espace
 * participant) : la puce "G" reste en Volt sur fond Navy pour rester
 * visible quel que soit le fond derrière le lien.
 */
export function BrandLogo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-heading text-lg tracking-wide">
      <span className="flex size-7 items-center justify-center rounded-md bg-volt text-sm text-volt-foreground">
        G
      </span>
      <span>GloboPadel</span>
    </Link>
  );
}
