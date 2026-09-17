// §4.8 — Tableau final. Seeding standard (quarts de 8 : 1-8, 4-5, 2-7,
// 3-6). Contrainte : deux équipes de la même poule ne se rencontrent pas
// au premier tour (permutation corrective si besoin). Un match pour la
// 3e place ("petite finale") est ajouté à côté du tableau principal dès
// qu'il y a des demi-finales (4 qualifiés ou plus) : les deux perdantes
// de demi s'y affrontent, plutôt que d'être 3es ex æquo.

export interface Qualifie {
  teamId: string;
  groupId: string;
}

export interface MatchTableau {
  id: string;
  round: number;
  bracketSlot: number;
  teamAId: string | null;
  teamBId: string | null;
  winnerId: string | null;
  nextMatchId: string | null;
  nextSlot: "a" | "b" | null;
  /** Uniquement renseigné sur les deux demi-finales : vers quel match
   * propager le PERDANT (la petite finale), en miroir de nextMatchId
   * qui ne propage que le vainqueur. */
  loserNextMatchId: string | null;
  loserNextSlot: "a" | "b" | null;
  /** "classement" uniquement pour le match de petite finale — le reste
   * du tableau principal reste "tableau". */
  phase: "tableau" | "classement";
}

/** Ordre de seeding standard d'un tableau à élimination directe (1-based). */
function ordreSeeding(n: number): number[] {
  if (n === 1) return [1];
  const precedent = ordreSeeding(n / 2);
  const resultat: number[] = [];
  for (const s of precedent) {
    resultat.push(s, n + 1 - s);
  }
  return resultat;
}

function eviterMemePoule(pairesInitiales: [Qualifie, Qualifie][]): [Qualifie, Qualifie][] {
  const paires = pairesInitiales.map((p) => [...p] as [Qualifie, Qualifie]);

  for (let i = 0; i < paires.length; i++) {
    const [a, b] = paires[i];
    if (a.groupId !== b.groupId) continue;

    for (let j = 0; j < paires.length; j++) {
      if (j === i) continue;
      const [c, d] = paires[j];

      if (a.groupId !== c.groupId && d.groupId !== b.groupId) {
        paires[i] = [a, c];
        paires[j] = [b, d];
        break;
      }
      if (a.groupId !== d.groupId && c.groupId !== b.groupId) {
        paires[i] = [a, d];
        paires[j] = [c, b];
        break;
      }
    }
    // Si aucune permutation ne résout le conflit, on laisse tel quel :
    // c'est le rôle de l'ajustement manuel admin (§4.4 étape 3) de trancher.
  }

  return paires;
}

export function genererTableau(qualifies: Qualifie[]): MatchTableau[] {
  const n = qualifies.length;
  if (n < 2 || (n & (n - 1)) !== 0) {
    throw new Error(`genererTableau nécessite une puissance de 2 d'équipes (reçu ${n}).`);
  }

  const seeds = ordreSeeding(n);
  const pairesInitiales: [Qualifie, Qualifie][] = [];
  for (let i = 0; i < n; i += 2) {
    pairesInitiales.push([qualifies[seeds[i] - 1], qualifies[seeds[i + 1] - 1]]);
  }

  const paires = eviterMemePoule(pairesInitiales);
  const matches: MatchTableau[] = [];
  const nbTours = Math.log2(n);

  let idsTourPrecedent: string[] = [];
  paires.forEach(([a, b], i) => {
    const id = `t1-m${i + 1}`;
    idsTourPrecedent.push(id);
    matches.push({
      id,
      round: 1,
      bracketSlot: i,
      teamAId: a.teamId,
      teamBId: b.teamId,
      winnerId: null,
      nextMatchId: null,
      nextSlot: null,
      loserNextMatchId: null,
      loserNextSlot: null,
      phase: "tableau",
    });
  });

  for (let tour = 2; tour <= nbTours; tour++) {
    const idsTour: string[] = [];
    const nbMatchsTour = idsTourPrecedent.length / 2;
    for (let i = 0; i < nbMatchsTour; i++) {
      const id = `t${tour}-m${i + 1}`;
      idsTour.push(id);
      matches.push({
        id,
        round: tour,
        bracketSlot: i,
        teamAId: null,
        teamBId: null,
        winnerId: null,
        nextMatchId: null,
        nextSlot: null,
        loserNextMatchId: null,
        loserNextSlot: null,
        phase: "tableau",
      });

      const matchPrecA = matches.find((m) => m.id === idsTourPrecedent[i * 2])!;
      const matchPrecB = matches.find((m) => m.id === idsTourPrecedent[i * 2 + 1])!;
      matchPrecA.nextMatchId = id;
      matchPrecA.nextSlot = "a";
      matchPrecB.nextMatchId = id;
      matchPrecB.nextSlot = "b";
    }
    idsTourPrecedent = idsTour;
  }

  // Petite finale : seulement s'il y a de vraies demi-finales (4
  // qualifiés ou plus — avec 2 qualifiés, l'unique match EST déjà la
  // finale, il n'y a personne à départager pour une 3e place).
  if (nbTours >= 2) {
    const demiFinales = matches.filter((m) => m.round === nbTours - 1);
    const petiteFinaleId = "petite-finale";
    matches.push({
      id: petiteFinaleId,
      round: nbTours,
      bracketSlot: -1,
      teamAId: null,
      teamBId: null,
      winnerId: null,
      nextMatchId: null,
      nextSlot: null,
      loserNextMatchId: null,
      loserNextSlot: null,
      phase: "classement",
    });
    demiFinales[0].loserNextMatchId = petiteFinaleId;
    demiFinales[0].loserNextSlot = "a";
    demiFinales[1].loserNextMatchId = petiteFinaleId;
    demiFinales[1].loserNextSlot = "b";
  }

  return matches;
}
