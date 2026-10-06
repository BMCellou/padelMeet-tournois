import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { AdminHeader } from "../../../AdminHeader";
import { AdminSidebar } from "../../../AdminSidebar";
import { FORMAT_PAR_DEFAUT, type MatchFormat } from "@/lib/engine/types";
import type { CritereDepartage } from "@/lib/engine/classement";
import { calculerVerrous, type FormatsParPhase, type PhaseFormat } from "@/lib/engine/formatPhases";
import { FormatRegles } from "./FormatRegles";

export default async function FormatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: tournamentId } = await params;
  const supabase = await createClient();

  const { data: tournoi } = await supabase
    .from("tournaments")
    .select("id, nom, format_config, format_par_phase, tiebreak_rules")
    .eq("id", tournamentId)
    .single();
  if (!tournoi) notFound();

  const { data: matchs } = await supabase
    .from("matches")
    .select("phase, round, statut")
    .eq("tournament_id", tournamentId);

  const formatsParPhase = (tournoi.format_par_phase ?? {}) as FormatsParPhase;
  const verrous = calculerVerrous(matchs ?? [], new Set(Object.keys(formatsParPhase) as PhaseFormat[]));
  const formatDefaut: MatchFormat = { ...FORMAT_PAR_DEFAUT, ...(tournoi.format_config as object as Partial<MatchFormat>) };

  return (
    <div className="min-h-screen bg-muted/20">
      <AdminHeader />
      <div className="flex flex-col sm:flex-row">
        <AdminSidebar tournamentId={tournoi.id} tournamentNom={tournoi.nom} />
        <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-8">
          <h1 className="text-2xl font-semibold">Format &amp; règles — {tournoi.nom}</h1>
          <FormatRegles
            tournamentId={tournoi.id}
            formatDefaut={formatDefaut}
            formatsParPhase={formatsParPhase}
            criteres={tournoi.tiebreak_rules as unknown as CritereDepartage[]}
            verrous={verrous}
          />
        </div>
      </div>
    </div>
  );
}
