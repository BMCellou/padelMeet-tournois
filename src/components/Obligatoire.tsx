// Marque d'un champ obligatoire : astérisque après le libellé, et légende sous le formulaire.
// Décoratif pour les lecteurs d'écran : l'attribut `required` du champ porte déjà l'information.

export function Obligatoire() {
  return (
    <span className="ml-0.5 text-destructive" aria-hidden="true">
      *
    </span>
  );
}

export function LegendeObligatoire() {
  return (
    <p className="text-xs text-muted-foreground">
      <span className="text-destructive" aria-hidden="true">
        *
      </span>{" "}
      Champs obligatoires
    </p>
  );
}
