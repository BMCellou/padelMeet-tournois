// §4.8 — Tableau final. Seeding standard (quarts de 8 : 1-8, 4-5, 2-7,
// 3-6). Contrainte : deux équipes de la même poule ne se rencontrent pas
// au premier tour (permutation corrective si besoin).

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

  return matches;
}
