import type { Event, Choice, Effects } from "./schema.js";
import type { CareerState, HistoryEntry } from "./state.js";
import type { Rng } from "./rng.js";

export type ApplyChoiceResult = {
  state: CareerState;
  outcomeText: string;
  resolvedSuccess?: boolean;
};

const STAT_FLOOR = 0;
const STAT_CEILING = 100;

function clampStat(value: number): number {
  return Math.max(STAT_FLOOR, Math.min(STAT_CEILING, value));
}

/**
 * Probabilité effective d'un choix à résolution. Formule d'équilibrage
 * retenue : P = pBase + (stat − 50) × 0,6, bornée [8, 92]. Sans pilote
 * (`pilot: null`), c'est un coup de dés pur sur pBase seul.
 */
export function resolutionProbability(state: CareerState, resolution: { pilot: string | null; pBase: number }): number {
  if (resolution.pilot === null) {
    return Math.max(0, Math.min(100, resolution.pBase));
  }
  const stat = state.stats[resolution.pilot] ?? 50;
  const p = resolution.pBase + (stat - 50) * 0.6;
  return Math.max(8, Math.min(92, p));
}

function mergeEffects(state: CareerState, effects: Effects): CareerState {
  const stats = { ...state.stats };
  const threads = new Set(state.threads);
  const threadLevels = { ...state.threadLevels };
  const threadPosedAtAge = { ...state.threadPosedAtAge };
  const unlockedEvents = new Set(state.unlockedEvents);
  const locks = { ...state.locks };
  let cap = state.cap;

  if (effects.stats) {
    for (const [stat, delta] of Object.entries(effects.stats)) {
      stats[stat] = clampStat((stats[stat] ?? 0) + delta);
    }
  }

  if (effects.threads) {
    for (const t of effects.threads) {
      threads.add(t);
      if (threadPosedAtAge[t] === undefined) threadPosedAtAge[t] = state.age;
    }
  }

  if (effects.threadIncrement) {
    for (const [t, delta] of Object.entries(effects.threadIncrement)) {
      const wasNew = threadLevels[t] === undefined;
      threadLevels[t] = (threadLevels[t] ?? 0) + delta;
      if (wasNew) threadPosedAtAge[t] = state.age;
    }
  }

  if (effects.threadsResolve) {
    for (const t of effects.threadsResolve) threads.delete(t);
  }

  if (effects.unlocks) {
    for (const id of effects.unlocks) unlockedEvents.add(id);
  }

  if (effects.locks) {
    const duration = effects.lockDuration ?? 1;
    for (const id of effects.locks) locks[id] = duration;
  }

  if (effects.capDelta) {
    cap += effects.capDelta;
  }

  return {
    ...state,
    stats,
    threads,
    threadLevels,
    threadPosedAtAge,
    unlockedEvents,
    locks,
    cap,
  };
}

/**
 * Applique le choix sélectionné : résout l'aléa s'il y en a un, fusionne les
 * effets dans l'état, journalise l'entrée d'historique (matière première de
 * la carte finale — section 11) et marque l'événement comme joué.
 */
export function applyChoice(
  state: CareerState,
  event: Event,
  choice: Choice,
  rng: Rng
): ApplyChoiceResult {
  let nextState = state;
  let outcomeText: string;
  let resolvedSuccess: boolean | undefined;

  if (choice.resolution) {
    const p = resolutionProbability(state, choice.resolution);
    const success = rng.chance(p);
    resolvedSuccess = success;
    const effects = success ? choice.resolution.onSuccess : choice.resolution.onFailure;
    outcomeText = success ? choice.resolution.textSuccess : choice.resolution.textFailure;
    nextState = mergeEffects(state, effects);
  } else if (choice.effects) {
    outcomeText = choice.outcome;
    nextState = mergeEffects(state, choice.effects);
  } else {
    // Ne devrait jamais arriver : le schéma impose effects XOR resolution.
    outcomeText = choice.outcome;
  }

  const played = new Set(nextState.played);
  played.add(event.id);

  const entry: HistoryEntry = {
    season: nextState.season,
    age: nextState.age,
    eventId: event.id,
    choiceId: choice.id,
    resolvedSuccess,
    outcomeText,
  };

  nextState = {
    ...nextState,
    played,
    history: [...nextState.history, entry],
    rngState: rng.getState(),
  };

  return { state: nextState, outcomeText, resolvedSuccess };
}

/** Fait avancer l'âge du joueur d'un nombre d'années donné (défaut : 1, une saison). */
export function advanceAge(state: CareerState, years = 1): CareerState {
  return { ...state, age: state.age + years };
}
