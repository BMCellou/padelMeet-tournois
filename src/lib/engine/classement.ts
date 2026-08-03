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

function ratio(gagne: number, perdu: number): number {
  const total = gagne + perdu;
  return total > 0 ? gagne / total : 0;
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

function departagerEnGroupes(
  equipes: StatsEquipe[],
  criteres: CritereDepartage[],
  matches: MatchTermine[],
): StatsEquipe[][] {
  if (equipes.length <= 1 || criteres.length === 0) return [equipes];

  const [critere, ...reste] = criteres;

  if (!critereApplicable(critere, equipes.length)) {
    return departagerEnGroupes(equipes, reste, matches);
  }

  const groupes = grouperParValeurDesc(equipes, critere, matches);

  if (groupes.length === 1) {
    // Critère non discriminant pour ce lot d'équipes : on l'ignore
    // silencieusement et on essaie le suivant.
    return departagerEnGroupes(equipes, reste, matches);
  }

  return groupes.flatMap((g) => departagerEnGroupes(g, reste, matches));
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
