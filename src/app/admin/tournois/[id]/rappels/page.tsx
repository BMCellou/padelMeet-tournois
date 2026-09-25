import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { AdminHeader } from "../../../AdminHeader";
import { AdminSidebar } from "../../../AdminSidebar";
import { chargerMatchsRappel, lireParametresRappels } from "@/lib/rappels/service";
import { RappelsPanel } from "./RappelsPanel";

export default async function RappelsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: tournamentId } = await params;
  const supabase = await createClient();

  const { data: tournoi } = await supabase
    .from("tournaments")
    .select("id, nom")
    .eq("id", tournamentId)
    .single();
  if (!tournoi) notFound();

  const [matchs, parametres] = await Promise.all([
    chargerMatchsRappel(supabase, { tournamentId }),
    lireParametresRappels(supabase),
  ]);

  return (
    <div className="min-h-screen bg-muted/20">
      <AdminHeader />
      <div className="flex flex-col sm:flex-row">
        <AdminSidebar tournamentId={tournoi.id} tournamentNom={tournoi.nom} />
        <div className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-8">
          <h1 className="text-2xl font-semibold">Rappels — {tournoi.nom}</h1>
          <RappelsPanel tournamentId={tournoi.id} matchs={matchs} parametres={parametres} />
        </div>
      </div>
    </div>
  );
}
