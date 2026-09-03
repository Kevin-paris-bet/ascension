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

/**
 * Crée un générateur déterministe depuis une seed texte. `restoredState`
 * permet de reprendre exactement au tirage suivant après une sauvegarde.
 */
export function createRng(seed: string, restoredState?: number): Rng {
  const seedFn = xmur3(seed);
  let state = restoredState ?? seedFn();

  function next(): number {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next,
    int(min: number, max: number) {
      return min + Math.floor(next() * (max - min + 1));
    },
    chance(pPercent: number) {
      return next() * 100 < pPercent;
    },
    weightedPick<T>(items: T[], weights: number[]): T {
      const total = weights.reduce((a, b) => a + b, 0);
      if (total <= 0) {
        throw new Error("weightedPick: la somme des poids doit être > 0");
      }
      let roll = next() * total;
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
