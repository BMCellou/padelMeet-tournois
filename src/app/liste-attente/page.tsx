import type { Metadata } from "next";
import { BrandLogo } from "@/components/BrandLogo";
import { sectionsRgpd } from "@/lib/liste-attente/rgpd";
import { ListeAttenteForm } from "./ListeAttenteForm";

export const metadata: Metadata = {
  title: "Liste d'attente — PadelMeet Tournois",
  description: "Sois prévenu(e) dès que la date et le lieu du prochain tournoi sont connus.",
};

export default function ListeAttentePage() {
  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="bg-primary p-3 text-primary-foreground">
        <div className="mx-auto w-fit">
          <BrandLogo />
        </div>
      </div>
      <div className="mx-auto w-full max-w-md p-4">
        <ListeAttenteForm rgpd={sectionsRgpd(process.env.NEXT_PUBLIC_CONTACT_EMAIL)} />
      </div>
    </div>
  );
}
