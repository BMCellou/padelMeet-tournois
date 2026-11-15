import type { Metadata } from "next";
import { BrandLogo } from "@/components/BrandLogo";
import { sectionsRgpd } from "@/lib/liste-attente/rgpd";
import { SiteFooter } from "@/components/SiteFooter";
import { ListeAttenteForm } from "./ListeAttenteForm";

export const metadata: Metadata = {
  title: "Liste d'attente — Globopadel",
  description: "Sois prévenu(e) dès que la date et le lieu du prochain tournoi sont connus.",
};

export default function ListeAttentePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="bg-primary p-3 text-primary-foreground">
        <div className="mx-auto w-fit">
          <BrandLogo />
        </div>
      </div>
      <div className="mx-auto w-full max-w-md p-4">
        <ListeAttenteForm rgpd={sectionsRgpd()} />
      </div>
      <SiteFooter />
    </div>
  );
}
