import type { ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import { SiteFooter } from "@/components/SiteFooter";

/** Mise en page commune des pages légales : bandeau de marque, contenu lisible, pied de page. */
export function PageLegale({ titre, misAJour, children }: { titre: string; misAJour?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="bg-primary p-3 text-primary-foreground">
        <div className="mx-auto w-fit">
          <BrandLogo />
        </div>
      </div>
      <main className="mx-auto w-full max-w-2xl flex-1 space-y-8 p-4 sm:py-8">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">{titre}</h1>
          {misAJour ? <p className="text-xs text-muted-foreground">Dernière mise à jour : {misAJour}</p> : null}
        </div>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

export function SectionLegale({ id, titre, children }: { id?: string; titre: string; children: ReactNode }) {
  return (
    <section id={id} className="space-y-2">
      <h2 className="text-lg font-semibold">{titre}</h2>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}
