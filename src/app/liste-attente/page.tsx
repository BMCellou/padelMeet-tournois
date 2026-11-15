import type { Metadata } from "next";
import { BrandLogo } from "@/components/BrandLogo";
import { sectionsRgpd } from "@/lib/liste-attente/rgpd";
import { getParticipantConnecte } from "@/lib/participant/session";
import { createServiceClient } from "@/lib/supabase/service";
import { SiteFooter } from "@/components/SiteFooter";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListeAttenteForm } from "./ListeAttenteForm";
import { ListeAttenteConnecte } from "./ListeAttenteConnecte";

export const metadata: Metadata = {
  title: "Liste d'attente — Globopadel",
  description: "Sois prévenu(e) dès que la date et le lieu du prochain tournoi sont connus.",
};

// La page dépend de la session : une personne connectée voit son inscription en un clic.
export const dynamic = "force-dynamic";

export default async function ListeAttentePage() {
  const participant = await getParticipantConnecte();
  const rgpd = sectionsRgpd();

  // La personne connectée peut déjà être sur la liste : c'est son propre e-mail qu'on cherche, rien d'autre n'est révélé.
  let dejaSurLaListe = false;
  if (participant?.email) {
    const { data } = await createServiceClient()
      .from("liste_attente")
      .select("id")
      .ilike("email", participant.email)
      .maybeSingle();
    dejaSurLaListe = !!data;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="bg-primary p-3 text-primary-foreground">
        <div className="mx-auto w-fit">
          <BrandLogo />
        </div>
      </div>
      <div className="mx-auto w-full max-w-md space-y-3 p-4">
        {participant?.email ? (
          dejaSurLaListe ? (
            <Card>
              <CardHeader>
                <CardTitle>Tu es sur la liste</CardTitle>
                <CardDescription>
                  Ton compte est prêt : on te prévient dès que la date et le lieu du prochain tournoi sont connus, et
                  tu n&apos;auras plus qu&apos;à t&apos;inscrire depuis le lien reçu.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <ListeAttenteConnecte
              prenom={participant.prenom}
              nom={participant.nom}
              email={participant.email}
              telephone={participant.telephone}
              rgpd={rgpd}
            />
          )
        ) : (
          <ListeAttenteForm rgpd={rgpd} />
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
