// Générateur pseudo-aléatoire reproductible (mulberry32). Le tirage au sort
// doit pouvoir être rejoué à l'identique en cas de contestation : on ne
// touche jamais à Math.random ni à Date.now dans le moteur, la graine est
// toujours un paramètre fourni par l'appelant.

export function creerRng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function melanger<T>(elements: T[], rng: () => number): T[] {
  const copie = [...elements];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}
