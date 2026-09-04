"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Rafraîchit une page en direct quand un score est saisi/validé, qu'une
 * équipe est modifiée, ou qu'une inscription (solo ou paire) arrive —
 * sans que la personne qui a la page ouverte ait à recharger. Utilisé
 * côté public (page tournoi) ET côté admin (écran Inscriptions) : les
 * policies RLS filtrent déjà ce que chaque session a le droit de voir,
 * un visiteur anonyme n'aura donc jamais d'événement sur `registrations`
 * (réservée à l'admin).
 */
export function RealtimeRefresher({ tournamentId }: { tournamentId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`tournoi-${tournamentId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matches", filter: `tournament_id=eq.${tournamentId}` },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "standings", filter: `tournament_id=eq.${tournamentId}` },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teams", filter: `tournament_id=eq.${tournamentId}` },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "registrations", filter: `tournament_id=eq.${tournamentId}` },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId, router]);

  return null;
}
