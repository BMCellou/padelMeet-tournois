"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  calculerContexteQualification,
  calculerMatchClassement5e,
  genererTableauAvecQualifies,
  type ResultatAction,
} from "@/lib/tournoi/tableauFinal";
import type { Qualifie } from "@/lib/engine/tableau";

/**
 * Régénère le tableau à partir d'une sélection de qualifiés choisie à la
 * main (repêchage) — le nombre d'équipes doit rester une puissance de 2
 * (contrainte du moteur de tableau), donc typiquement un simple
 * remplacement d'une équipe par une autre plutôt qu'un ajout/retrait.
 */
export async function regenererTableauAvecQualifies(
  tournamentId: string,
  teamIds: string[],
): Promise<ResultatAction> {
  const supabase = await createClient();

  const contexte = await calculerContexteQualification(supabase, tournamentId);
  if ("error" in contexte) return { error: contexte.error };

  const groupIdParEquipe = new Map(contexte.equipes.map((e) => [e.teamId, e.groupId]));
  const idsInconnus = teamIds.filter((id) => !groupIdParEquipe.has(id));
  if (idsInconnus.length > 0) {
    return { error: "Sélection invalide : une équipe choisie n'appartient pas à ce tournoi." };
  }
  if (teamIds.length !== contexte.tailleTableau) {
    return {
      error: `Choisis exactement ${contexte.tailleTableau} équipes qualifiées (${teamIds.length} sélectionnée${teamIds.length > 1 ? "s" : ""}).`,
    };
  }

  const qualifies: Qualifie[] = teamIds.map((teamId) => ({
    teamId,
    groupId: groupIdParEquipe.get(teamId)!,
  }));

  const qualifiesIds = new Set(teamIds);
  const classement5e = await calculerMatchClassement5e(
    supabase,
    tournamentId,
    contexte.equipes,
    qualifiesIds,
  );

  const resultat = await genererTableauAvecQualifies(supabase, tournamentId, qualifies, classement5e);
  if ("success" in resultat) {
    revalidatePath(`/admin/tournois/${tournamentId}/tableau`);
  }
  return resultat;
}
