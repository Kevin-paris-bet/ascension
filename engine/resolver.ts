import type { Event, Choice, Requires } from "./schema";
import {
  type CareerState,
  hasThread,
  threadLevel,
  seasonsSinceThread,
  isLocked,
  isUnlocked,
} from "./state";
import type { Rng } from "./rng";

/**
 * Le moteur de cohérence — la règle d'or (section 9.3) :
 * un événement ne se tire jamais librement, il doit satisfaire ses
 * préconditions d'état. Ce fichier implémente les trois mécanismes
 * obligatoires : verrouillage (locks, dans state.ts), déverrouillage
 * conditionnel (unlockedEvents), et l'évaluation de `requires`.
 */

function compare(value: number, op: string, target: number): boolean {
  switch (op) {
    case ">=":
      return value >= target;
    case "<=":
      return value <= target;
    case ">":
      return value > target;
    case "<":
      return value < target;
    case "==":
      return value === target;
    default:
      return false;
  }
}

/** Évalue un bloc `requires` (au niveau événement ou choix) contre l'état courant. */
export function matchesRequires(state: CareerState, requires: Requires | undefined): boolean {
  if (!requires) return true;

  if (requires.age) {
    const [min, max] = requires.age;
    if (state.age < min || state.age > max) return false;
  }

  if (requires.stats) {
    for (const [stat, [op, target]] of Object.entries(requires.stats)) {
      const value = state.stats[stat] ?? 0;
      if (!compare(value, op, target)) return false;
    }
  }

  if (requires.threads) {
    for (const t of requires.threads) {
      if (!hasThread(state, t)) return false;
    }
  }

  if (requires.threadsAbsent) {
    for (const t of requires.threadsAbsent) {
      if (hasThread(state, t)) return false;
    }
  }

  if (requires.threadLevel) {
    for (const [t, [op, target]] of Object.entries(requires.threadLevel)) {
      if (!compare(threadLevel(state, t), op, target)) return false;
    }
  }

  if (requires.seasonsSinceThread) {
    for (const [t, [op, target]] of Object.entries(requires.seasonsSinceThread)) {
      const since = seasonsSinceThread(state, t);
      if (since === null) return false;
      if (!compare(since, op, target)) return false;
    }
  }

  if (requires.orgTier) {
    const [op, target] = requires.orgTier;
    if (state.orgTier === null) return false;
    if (!compare(state.orgTier, op, target)) return false;
  }

  return true;
}

/**
 * Un événement est éligible si : sa fenêtre d'âge couvre l'âge courant, il
 * n'est pas verrouillé, il n'a pas déjà été joué (si `once`), aucun événement
 * de sa liste `excludes` n'a été joué, et — soit ses préconditions sont
 * satisfaites, soit il a été explicitement débloqué par un effet `unlocks`
 * (déverrouillage conditionnel, indépendant de `requires`).
 */
export function isEventEligible(state: CareerState, event: Event): boolean {
  const [minAge, maxAge] = event.ageWindow;
  if (state.age < minAge || state.age > maxAge) return false;
  if (isLocked(state, event.id)) return false;
  if (event.once && state.played.has(event.id)) return false;

  if (event.excludes) {
    for (const excludedId of event.excludes) {
      if (state.played.has(excludedId)) return false;
    }
  }

  const requirementsOk = matchesRequires(state, event.requires);
  return requirementsOk || isUnlocked(state, event.id);
}

/**
 * Actes I et II : progression scriptée. Un seul événement doit normalement
 * matcher l'âge courant. S'il y en a plusieurs d'éligibles, le premier dans
 * l'ordre du pool est retenu (déterministe, aucun aléa).
 */
export function resolveScriptedEvent(state: CareerState, pool: Event[]): Event | null {
  const candidates = pool.filter(
    (e) => (e.act === 1 || e.act === 2) && isEventEligible(state, e)
  );
  return candidates[0] ?? null;
}

/**
 * Acte III : tirage pondéré parmi les événements éligibles. `weight` pilote
 * la fréquence relative ; un événement à weight 0 ne sera jamais tiré (c'est
 * la règle POIDS vérifiée par le validateur de contenu).
 */
export function resolveRandomEvent(state: CareerState, pool: Event[], rng: Rng): Event | null {
  const candidates = pool.filter(
    (e) => e.act === 3 && e.weight > 0 && isEventEligible(state, e)
  );
  if (candidates.length === 0) return null;
  const weights = candidates.map((e) => e.weight);
  return rng.weightedPick(candidates, weights);
}

export function resolveNextEvent(state: CareerState, pool: Event[], rng: Rng): Event | null {
  return (
    resolveScriptedEvent(state, pool) ??
    (state.age >= 3 ? resolveRandomEvent(state, pool, rng) : null)
  );
}

/**
 * Choix affichés pour un événement donné : tous les choix de base (sans
 * `requires`), plus jusqu'à 2 choix conditionnels éligibles, dans l'ordre de
 * déclaration. Plafond de 6 choix à l'écran (contrôle ECRAN_CHARGE du
 * validateur — au-delà, le moteur tronque plutôt que de planter).
 */
export function eligibleChoices(state: CareerState, event: Event, maxConditional = 2): Choice[] {
  const base = event.choices.filter((c) => !c.requires);
  const conditional = event.choices
    .filter((c) => c.requires && matchesRequires(state, c.requires))
    .slice(0, maxConditional);
  return [...base, ...conditional].slice(0, 6);
}
