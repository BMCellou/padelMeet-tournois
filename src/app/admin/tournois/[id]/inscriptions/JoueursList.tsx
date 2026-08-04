import { JoueurEditDialog, type JoueurEditable } from "./JoueurEditDialog";

export interface JoueurAffiche extends JoueurEditable {
  equipeNom: string | null;
}

export function JoueursList({
  tournamentId,
  joueurs,
}: {
  tournamentId: string;
  joueurs: JoueurAffiche[];
}) {
  if (joueurs.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun joueur inscrit pour l&apos;instant.</p>;
  }

  return (
    <ul className="divide-y rounded-lg border">
      {joueurs.map((j) => (
        <li key={j.id} className="flex items-center justify-between gap-2 p-3 text-sm">
          <div>
            <p>
              {j.prenom} {j.nom}
              {j.sexe ? ` (${j.sexe})` : ""}
            </p>
            <p className="text-xs text-muted-foreground">
              {j.classementFft ? `Classement ${j.classementFft}` : "Classement non renseigné"}
              {j.equipeNom ? ` — ${j.equipeNom}` : " — sans équipe"}
            </p>
          </div>
          <JoueurEditDialog tournamentId={tournamentId} joueur={j} />
        </li>
      ))}
    </ul>
  );
}
