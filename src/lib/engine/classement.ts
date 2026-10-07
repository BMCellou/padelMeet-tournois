// §4.6 — Classement de poule. Ordre de départage configurable. Tout
// critère non discriminant pour les équipes encore à égalité est ignoré
// silencieusement et on passe au critère suivant — c'est ce mécanisme
// générique qui neutralise automatiquement la différence de sets en
// format 1 set sec (elle vaut toujours ±1 pour tout le monde), sans
// aucun code spécifique à ce format.

export interface MatchTermine {
  teamAId: string;
  teamBId: string;
  vainqueurId: string;
  setsA: number;
  setsB: number;
  jeuxA: number;
  jeuxB: number;
}

export interface StatsEquipe {
  teamId: string;
  joues: number;
  v: number;
  d: number;
  setsG: number;
  setsP: number;
  jeuxG: number;
  jeuxP: number;
  ratioSets: number;
  ratioJeux: number;
}

export type CritereDepartage =
  | "victoires"
  | "confrontation_directe"
  | "mini_classement"
  | "difference_sets"
  | "ratio_sets"
  | "difference_jeux"
  | "ratio_jeux";

export interface EquipeClassee extends StatsEquipe {
  rang: number;
}

/**
 * Ratio « gagnés / joués » (joués = gagnés + perdus) : toujours dans [0, 1],
 * jamais Infinity (équipe invaincue : 1) ni NaN (aucun set ou jeu joué : 0).
 * Un NaN dans un comparateur de tri réordonne silencieusement : le
 * dénominateur est donc borné ici, une fois pour toutes.
 */
function ratio(gagne: number, perdu: number): number {
  const joues = gagne + perdu;
  return joues > 0 ? gagne / joues : 0;
}

function construireStats(matches: MatchTermine[], equipeIds: string[]): StatsEquipe[] {
  const stats = new Map<string, StatsEquipe>(
    equipeIds.map((teamId) => [
      teamId,
      {
        teamId,
        joues: 0,
        v: 0,
        d: 0,
        setsG: 0,
        setsP: 0,
        jeuxG: 0,
        jeuxP: 0,
        ratioSets: 0,
        ratioJeux: 0,
      },
    ]),
  );

  for (const m of matches) {
    const a = stats.get(m.teamAId);
    const b = stats.get(m.teamBId);
    if (!a || !b) continue;

    a.joues++;
    b.joues++;
    if (m.vainqueurId === m.teamAId) {
      a.v++;
      b.d++;
    } else {
      b.v++;
      a.d++;
    }
    a.setsG += m.setsA;
    a.setsP += m.setsB;
    b.setsG += m.setsB;
    b.setsP += m.setsA;
    a.jeuxG += m.jeuxA;
    a.jeuxP += m.jeuxB;
    b.jeuxG += m.jeuxB;
    b.jeuxP += m.jeuxA;
  }

  for (const s of stats.values()) {
    s.ratioSets = ratio(s.setsG, s.setsP);
    s.ratioJeux = ratio(s.jeuxG, s.jeuxP);
  }

  return equipeIds.map((id) => stats.get(id)!);
}

function critereApplicable(critere: CritereDepartage, nombreEquipesAEgalite: number): boolean {
  if (critere === "confrontation_directe") return nombreEquipesAEgalite === 2;
  if (critere === "mini_classement") return nombreEquipesAEgalite >= 3;
  return true;
}

function valeurSimple(e: StatsEquipe, critere: CritereDepartage): number | null {
  switch (critere) {
    case "victoires":
      return e.v;
    case "difference_sets":
      return e.setsG - e.setsP;
    case "ratio_sets":
      return e.ratioSets;
    case "difference_jeux":
      return e.jeuxG - e.jeuxP;
    case "ratio_jeux":
      return e.ratioJeux;
    default:
      return null; // confrontation_directe / mini_classement traités à part
  }
}

function victoiresEntreEux(equipes: StatsEquipe[], matches: MatchTermine[]): Map<string, number> {
  const ids = new Set(equipes.map((e) => e.teamId));
  const victoires = new Map<string, number>(equipes.map((e) => [e.teamId, 0]));
  for (const m of matches) {
    if (!ids.has(m.teamAId) || !ids.has(m.teamBId)) continue;
    victoires.set(m.vainqueurId, (victoires.get(m.vainqueurId) ?? 0) + 1);
  }
  return victoires;
}

function grouperParValeurDesc(
  equipes: StatsEquipe[],
  critere: CritereDepartage,
  matches: MatchTermine[],
): StatsEquipe[][] {
  let valeurs: Map<string, number>;

  if (critere === "confrontation_directe" || critere === "mini_classement") {
    valeurs = victoiresEntreEux(equipes, matches);
  } else {
    valeurs = new Map(equipes.map((e) => [e.teamId, valeurSimple(e, critere)!]));
  }

  const parValeur = new Map<number, StatsEquipe[]>();
  for (const e of equipes) {
    const v = valeurs.get(e.teamId)!;
    if (!parValeur.has(v)) parValeur.set(v, []);
    parValeur.get(v)!.push(e);
  }

  return [...parValeur.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, groupe]) => groupe);
}

/**
 * Départage un groupe d'équipes à égalité avec la chaîne de critères complète.
 * La chaîne est RÉENTRANTE : dès qu'un critère sépare le groupe en plusieurs
 * sous-groupes, chacun repart du premier critère — les critères déjà passés
 * (confrontation directe, mini-classement…) peuvent donc s'appliquer de nouveau
 * à ce qui reste. Exemple : trois équipes à égalité sont séparées par le ratio
 * de jeux en 1 + 2 ; les deux restantes se départagent alors par leur
 * confrontation directe.
 *
 * Fin de récursion : un passage complet de la chaîne qui ne sépare plus le
 * groupe en deux ou plus le laisse tel quel (égalité parfaite). Chaque appel
 * récursif porte sur un groupe strictement plus petit : pas de boucle infinie.
 * Un critère non applicable (confrontation directe hors égalité à deux,
 * mini-classement hors égalité à trois ou plus) est simplement sauté.
 */
function departagerEnGroupes(
  equipes: StatsEquipe[],
  criteres: CritereDepartage[],
  matches: MatchTermine[],
): StatsEquipe[][] {
  if (equipes.length <= 1) return [equipes];

  for (const critere of criteres) {
    if (!critereApplicable(critere, equipes.length)) continue;
    const groupes = grouperParValeurDesc(equipes, critere, matches);
    // Un critère qui ne sépare personne est ignoré silencieusement.
    if (groupes.length === 1) continue;
    return groupes.flatMap((g) => departagerEnGroupes(g, criteres, matches));
  }

  return [equipes];
}

function assignerRangs(groupes: StatsEquipe[][]): EquipeClassee[] {
  const resultat: EquipeClassee[] = [];
  let rang = 1;
  for (const groupe of groupes) {
    for (const e of groupe) resultat.push({ ...e, rang });
    rang += groupe.length;
  }
  return resultat;
}

export function calculerClassement(
  matches: MatchTermine[],
  equipeIds: string[],
  criteres: CritereDepartage[],
): EquipeClassee[] {
  const stats = construireStats(matches, equipeIds);
  const groupes = departagerEnGroupes(stats, criteres, matches);
  return assignerRangs(groupes);
}
