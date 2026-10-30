import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { AdminHeader } from "../../../AdminHeader";
import { AdminSidebar } from "../../../AdminSidebar";
import { chargerDestinatairesTournoi } from "@/lib/messages/charger";
import { modeleInfosPratiques } from "@/lib/messages/inscrits";
import { dateEnLettres } from "@/lib/pdf/mise-en-page";
import { MessagesPanel } from "./MessagesPanel";

// Un envoi à plusieurs dizaines de joueurs dure plusieurs secondes par lot.
export const maxDuration = 60;

export default async function MessagesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: tournamentId } = await params;
  const supabase = await createClient();

  const { data: tournoi } = await supabase
    .from("tournaments")
    .select("id, nom, date, heure_debut, clubs(nom, ville)")
    .eq("id", tournamentId)
    .single();
  if (!tournoi) notFound();

  const [destinataires, { count: nbMatchsPlanifies }] = await Promise.all([
    chargerDestinatairesTournoi(supabase, tournamentId),
    supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("tournament_id", tournamentId)
      .not("scheduled_at", "is", null),
  ]);

  const club = tournoi.clubs ? `${tournoi.clubs.nom}${tournoi.clubs.ville ? `, ${tournoi.clubs.ville}` : ""}` : null;
  const modele = modeleInfosPratiques({
    nom: tournoi.nom,
    dateLisible: dateEnLettres(tournoi.date),
    heure: tournoi.heure_debut.slice(0, 5),
    club,
  });

  return (
    <div className="min-h-screen bg-muted/20">
      <AdminHeader />
      <div className="flex flex-col sm:flex-row">
        <AdminSidebar tournamentId={tournoi.id} tournamentNom={tournoi.nom} />
        <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-8">
          <h1 className="text-2xl font-semibold">Messages — {tournoi.nom}</h1>
          <p className="text-sm text-muted-foreground">
            Envoi par {process.env.EMAIL_FOURNISSEUR === "make" ? "Make (Gmail)" : "Resend"}.
          </p>
          <MessagesPanel
            tournamentId={tournoi.id}
            modele={modele}
            destinataires={destinataires}
            planningDisponible={(nbMatchsPlanifies ?? 0) > 0}
          />
        </div>
      </div>
    </div>
  );
}
