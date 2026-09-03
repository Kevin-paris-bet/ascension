/**
 * Aléatoire déterministe. Deux carrières avec la même seed et les mêmes choix
 * doivent produire exactement le même résultat — c'est le prérequis du défi du
 * jour (section 9.4 des specs) et du débogage.
 *
 * xmur3 dérive un état 32 bits reproductible depuis une chaîne quelconque.
 * mulberry32 est le générateur lui-même : rapide, correct pour du jeu (pas
 * cryptographique), et déterministe à partir de son état.
 */

export type Rng = {
  /** Flottant dans [0, 1) */
  next(): number;
  /** Entier dans [min, max] inclus */
  int(min: number, max: number): number;
  /** true avec une probabilité p (0-100) */
  chance(pPercent: number): boolean;
  /** Sélection pondérée. weights.length === items.length. */
  weightedPick<T>(items: T[], weights: number[]): T;
  /** État courant, utile pour sérialiser une carrière en cours */
  getState(): number;
};

function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Crée un générateur déterministe à partir d'une seed texte (ex. le seed de la carrière). */
export function createRng(seed: string): Rng {
  const seedFn = xmur3(seed);
  let state = seedFn();
  const gen = mulberry32(state);

  return {
    next: gen,
    int(min: number, max: number) {
      return min + Math.floor(gen() * (max - min + 1));
    },
    chance(pPercent: number) {
      return gen() * 100 < pPercent;
    },
    weightedPick<T>(items: T[], weights: number[]): T {
      const total = weights.reduce((a, b) => a + b, 0);
      if (total <= 0) {
        throw new Error("weightedPick: la somme des poids doit être > 0");
      }
      let roll = gen() * total;
      for (let i = 0; i < items.length; i++) {
        roll -= weights[i];
        if (roll <= 0) return items[i];
      }
      return items[items.length - 1];
    },
    getState() {
      return state;
    },
  };
}
