import { Badge } from "@/components/ui/badge";
import type { SetSaisi } from "@/lib/engine/score";
import { cn } from "@/lib/utils";

export interface MatchPublicAffiche {
  id: string;
  round: number;
  statut: string;
  teamANom: string;
  teamBNom: string;
  vainqueur: "a" | "b" | null;
  sets: SetSaisi[];
  courtNom?: string | null;
  heure?: string | null;
}

const LIBELLES_STATUT: Record<string, string> = {
  a_venir: "À venir",
  pret: "Prêt",
  en_cours: "En cours",
  saisi: "En cours",
  valide: "Terminé",
  forfait: "Forfait",
};

function scoreResume(sets: SetSaisi[]): string {
  if (sets.length === 0) return "—";
  return sets
    .map((s) => {
      const tb =
        s.tiebreakA != null && s.tiebreakB != null
          ? `(${Math.min(s.tiebreakA, s.tiebreakB)})`
          : "";
      return `${s.jeuxA}-${s.jeuxB}${tb}`;
    })
    .join(", ");
}

export function PublicMatchCard({ match }: { match: MatchPublicAffiche }) {
  return (
    <div className="space-y-2 rounded-md border bg-background p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">
          {match.courtNom ? `${match.courtNom}` : `Tour ${match.round}`}
          {match.heure ? ` · ${match.heure}` : ""}
        </span>
        <Badge
          variant={match.statut === "valide" || match.statut === "forfait" ? "default" : "outline"}
        >
          {LIBELLES_STATUT[match.statut] ?? match.statut}
        </Badge>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className={cn("truncate", match.vainqueur === "a" && "font-semibold")}>
          {match.teamANom}
        </span>
        <span className="shrink-0 text-muted-foreground">
          {match.statut === "forfait"
            ? `Forfait (${match.vainqueur === "a" ? match.teamANom : match.teamBNom})`
            : scoreResume(match.sets)}
        </span>
        <span className={cn("truncate", match.vainqueur === "b" && "font-semibold")}>
          {match.teamBNom}
        </span>
      </div>
    </div>
  );
}
