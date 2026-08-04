import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface ExemptParPoule {
  pouleNom: string;
  exempts: { round: number; equipeNom: string }[];
}

export function ExemptsList({ donnees }: { donnees: ExemptParPoule[] }) {
  const avecExempts = donnees.filter((d) => d.exempts.length > 0);
  if (avecExempts.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Repos (poules à effectif impair)</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {avecExempts.map((d) => (
          <div key={d.pouleNom}>
            <p className="mb-1 text-sm font-medium">Poule {d.pouleNom}</p>
            <ul className="space-y-0.5 text-sm text-muted-foreground">
              {d.exempts.map((e) => (
                <li key={e.round}>
                  Tour {e.round} : {e.equipeNom}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
