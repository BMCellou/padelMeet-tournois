import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface LigneClassement {
  rang: number | null;
  equipeNom: string;
  joues: number;
  v: number;
  d: number;
  ratioSets: number | null;
  ratioJeux: number | null;
}

export function StandingsTable({ lignes }: { lignes: LigneClassement[] }) {
  if (lignes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Classement disponible dès le premier match validé.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">#</TableHead>
          <TableHead>Équipe</TableHead>
          <TableHead className="text-right">J</TableHead>
          <TableHead className="text-right">V</TableHead>
          <TableHead className="text-right">D</TableHead>
          <TableHead className="text-right">Ratio sets</TableHead>
          <TableHead className="text-right">Ratio jeux</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lignes.map((l, i) => (
          <TableRow key={i}>
            <TableCell>{l.rang ?? "—"}</TableCell>
            <TableCell>{l.equipeNom}</TableCell>
            <TableCell className="text-right">{l.joues}</TableCell>
            <TableCell className="text-right">{l.v}</TableCell>
            <TableCell className="text-right">{l.d}</TableCell>
            <TableCell className="text-right">
              {l.ratioSets != null ? l.ratioSets.toFixed(2) : "—"}
            </TableCell>
            <TableCell className="text-right">
              {l.ratioJeux != null ? l.ratioJeux.toFixed(2) : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
