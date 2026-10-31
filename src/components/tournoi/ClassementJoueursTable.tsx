import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/** Une ligne de `standings_joueurs`, telle que la page publique la lit (colonnes publiques uniquement). */
export interface LigneClassementJoueur {
  nom_affiche: string;
  manches_jouees: number;
  victoires: number;
  points_marques: number;
  points_encaisses: number;
  difference: number;
  tours_exempt: number;
  points_par_manche: number;
  rang: number | null;
}

export function ClassementJoueursTable({
  lignes,
  parManche,
}: {
  lignes: LigneClassementJoueur[];
  /** Mode « points par manche » : la colonne principale est la moyenne, pas le total. */
  parManche?: boolean;
}) {
  const jouees = lignes.some((l) => l.manches_jouees > 0);
  if (lignes.length === 0 || !jouees) {
    return <p className="text-sm text-muted-foreground">Classement disponible dès la première manche validée.</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">#</TableHead>
          <TableHead>Joueur</TableHead>
          <TableHead className="text-right">{parManche ? "Pts/manche" : "Pts"}</TableHead>
          <TableHead className="text-right">Diff</TableHead>
          <TableHead className="text-right">V</TableHead>
          <TableHead className="text-right">M</TableHead>
          <TableHead className="text-right">Repos</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lignes.map((l) => (
          <TableRow key={l.nom_affiche}>
            <TableCell>{l.rang ?? "—"}</TableCell>
            <TableCell>{l.nom_affiche}</TableCell>
            <TableCell className="text-right">{parManche ? l.points_par_manche : l.points_marques}</TableCell>
            <TableCell className="text-right">{l.difference > 0 ? `+${l.difference}` : l.difference}</TableCell>
            <TableCell className="text-right">{l.victoires}</TableCell>
            <TableCell className="text-right">{l.manches_jouees}</TableCell>
            <TableCell className="text-right">{l.tours_exempt}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
