import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface LigneFinale {
  rang: number;
  equipeNom: string;
}

const MEDAILLES: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

export function ClassementFinalList({ lignes }: { lignes: LigneFinale[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Classement final</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="divide-y rounded-lg border">
          {lignes.map((l, i) => (
            <li
              key={i}
              className={cn(
                "flex items-center gap-3 p-3 text-sm",
                l.rang <= 3 && "bg-primary/5 font-medium",
              )}
            >
              <span className="w-8 shrink-0 text-muted-foreground">
                {MEDAILLES[l.rang] ?? l.rang}
              </span>
              <span>{l.equipeNom}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
