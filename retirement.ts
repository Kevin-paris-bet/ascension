import type { CareerState } from "./state";
import type { Rng } from "./rng";

export type RetirementConfig = {
  /** Âge à partir duquel la retraite devient possible */
  minAge: number;
  /** Âge auquel la retraite est certaine */
  maxAge: number;
  /** Probabilité de base à minAge, en pourcentage */
  baseChance: number;
  /** Points de probabilité ajoutés par année au-delà de minAge */
  chancePerYear: number;
  /** Threads qui accélèrent la fin de carrière, et leur poids en points */
  acceleratingThreads?: Record<string, number>;
  /** Threads qui la retardent */
  delayingThreads?: Record<string, number>;
  /** Stat de condition physique : sous ce seuil, la retraite se rapproche */
  fitnessStat?: string;
  fitnessFloor?: number;
};

/**
 * Décide si la carrière s'arrête cette saison. Le moteur ne connaît pas le
 * sport : tous les seuils et les threads déclencheurs viennent du pack de
 * contenu. Le tirage passe par le PRNG à seed, donc la retraite est
 * reproductible comme le reste de la carrière.
 */
export function shouldRetire(state: CareerState, config: RetirementConfig, rng: Rng): boolean {
  if (state.age >= config.maxAge) return true;
  if (state.age < config.minAge) {
    // Une carrière peut être brisée avant l'âge normal de la retraite.
    return config.acceleratingThreads
      ? Object.keys(config.acceleratingThreads).some(
          (t) => t === "carriere_brisee" && state.threads.has(t)
        ) && rng.chance(60)
      : false;
  }

  let chance = config.baseChance + (state.age - config.minAge) * config.chancePerYear;

  for (const [thread, weight] of Object.entries(config.acceleratingThreads ?? {})) {
    if (state.threads.has(thread)) chance += weight;
  }
  for (const [thread, weight] of Object.entries(config.delayingThreads ?? {})) {
    if (state.threads.has(thread)) chance -= weight;
  }

  if (config.fitnessStat && config.fitnessFloor !== undefined) {
    const fitness = state.stats[config.fitnessStat] ?? 50;
    if (fitness < config.fitnessFloor) chance += (config.fitnessFloor - fitness) * 1.5;
  }

  return rng.chance(Math.max(0, Math.min(100, chance)));
}
