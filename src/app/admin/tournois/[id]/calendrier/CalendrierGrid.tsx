"use client";

import { useMemo } from "react";
import {
  DndContext,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { deplacerMatch } from "./actions";
import { detecterConflits, type MatchPlanifieAvecEquipes } from "@/lib/engine/conflits";
import { formatHeureParis } from "@/lib/temps";
import { cn } from "@/lib/utils";

export interface MatchAffiche {
  id: string;
  courtId: string | null;
  debut: string | null; // ISO
  dureeMin: number;
  teamAId: string;
  teamBId: string;
  teamANom: string;
  teamBNom: string;
  pouleNom: string;
  round: number;
}

interface Terrain {
  id: string;
  nom: string;
}

const SEPARATEUR = "__";

function cleCase(courtId: string, slotISO: string): string {
  return `${courtId}${SEPARATEUR}${slotISO}`;
}

function MatchCard({
  match,
  enConflit,
}: {
  match: MatchAffiche;
  enConflit: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: match.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={
        transform
          ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 10 }
          : undefined
      }
      className={cn(
        "cursor-grab rounded-md border p-2 text-xs shadow-sm active:cursor-grabbing",
        enConflit ? "border-destructive bg-destructive/10" : "bg-background",
        isDragging && "opacity-50",
      )}
      title={enConflit ? "Conflit détecté : voir la liste ci-dessous" : undefined}
    >
      <div className="font-medium">Poule {match.pouleNom}</div>
      <div>{match.teamANom}</div>
      <div className="text-muted-foreground">vs</div>
      <div>{match.teamBNom}</div>
    </div>
  );
}

function Cellule({
  courtId,
  slotISO,
  match,
  enConflit,
}: {
  courtId: string;
  slotISO: string;
  match: MatchAffiche | undefined;
  enConflit: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: cleCase(courtId, slotISO) });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-h-20 min-w-36 rounded-md border border-dashed p-1",
        isOver && "border-primary bg-primary/5",
      )}
    >
      {match ? <MatchCard match={match} enConflit={enConflit} /> : null}
    </div>
  );
}

export function CalendrierGrid({
  tournamentId,
  terrains,
  matches,
  reposMinMin,
}: {
  tournamentId: string;
  terrains: Terrain[];
  matches: MatchAffiche[];
  reposMinMin: number;
}) {
  const slots = useMemo(() => {
    const uniques = new Set(matches.filter((m) => m.debut).map((m) => m.debut!));
    return [...uniques].sort();
  }, [matches]);

  const matchParCase = useMemo(() => {
    const carte = new Map<string, MatchAffiche>();
    for (const m of matches) {
      if (m.courtId && m.debut) carte.set(cleCase(m.courtId, m.debut), m);
    }
    return carte;
  }, [matches]);

  const conflits = useMemo(() => {
    const matchsPlanifies: MatchPlanifieAvecEquipes[] = matches
      .filter((m) => m.courtId && m.debut)
      .map((m) => ({
        matchId: m.id,
        courtId: m.courtId!,
        teamAId: m.teamAId,
        teamBId: m.teamBId,
        debut: m.debut!,
        fin: new Date(new Date(m.debut!).getTime() + m.dureeMin * 60_000).toISOString(),
      }));
    return detecterConflits(matchsPlanifies, reposMinMin);
  }, [matches, reposMinMin]);

  const matchsEnConflit = useMemo(() => {
    const ids = new Set<string>();
    for (const c of conflits) {
      ids.add(c.matchIds[0]);
      ids.add(c.matchIds[1]);
    }
    return ids;
  }, [conflits]);

  function handleDragEnd(event: DragEndEvent) {
    const matchId = String(event.active.id);
    const cibleId = event.over?.id;
    if (!cibleId) return;

    const [courtId, slotISO] = String(cibleId).split(SEPARATEUR);
    const match = matches.find((m) => m.id === matchId);
    if (!match) return;
    if (match.courtId === courtId && match.debut === slotISO) return;

    deplacerMatch(tournamentId, matchId, courtId, slotISO);
  }

  return (
    <div className="space-y-4">
      {conflits.length > 0 ? (
        <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
          <p className="font-medium">{conflits.length} conflit(s) détecté(s)</p>
          <ul className="mt-1 list-inside list-disc">
            {conflits.map((c, i) => (
              <li key={i}>
                {c.type === "meme_terrain" && "Même terrain occupé deux fois"}
                {c.type === "equipe_double_reservee" && "Une équipe est convoquée deux fois"}
                {c.type === "repos_insuffisant" && "Repos insuffisant entre deux matchs"}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <DndContext onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto">
          <table className="border-separate border-spacing-2">
            <thead>
              <tr>
                <th className="text-left text-xs text-muted-foreground">Heure</th>
                {terrains.map((t) => (
                  <th key={t.id} className="text-left text-xs text-muted-foreground">
                    {t.nom}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slots.map((slotISO) => (
                <tr key={slotISO}>
                  <td className="align-top text-xs text-muted-foreground">
                    {formatHeureParis(slotISO)}
                  </td>
                  {terrains.map((t) => {
                    const match = matchParCase.get(cleCase(t.id, slotISO));
                    return (
                      <td key={t.id} className="align-top">
                        <Cellule
                          courtId={t.id}
                          slotISO={slotISO}
                          match={match}
                          enConflit={!!match && matchsEnConflit.has(match.id)}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DndContext>
    </div>
  );
}
