"use client";

import { createInitialState, advanceSeason, type CareerState } from "@/engine/state";
import { resolveScriptedEvent, resolveRandomEvent, eligibleChoices } from "@/engine/resolver";
import { applyChoice, advanceAge } from "@/engine/progression";
import { computeLegacy, type LegacyResult } from "@/engine/legacy";
import { createRng, type Rng } from "@/engine/rng";
import type { Event, Choice } from "@/engine/schema";
import { events } from "@/content/fr-football/events/index";
import config from "@/content/fr-football/config.json";

export type GameConfig = typeof config;

export type CreationOptions = {
  origin?: string;
  don?: string;
  seed?: string;
};

function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function createCareer(options: CreationOptions = {}): { state: CareerState; rng: Rng } {
  const seed = options.seed ?? randomSeed();

  const initialStats: Record<string, number> = {};
  for (const s of config.stats.visible) initialStats[s.id] = s.start;
  for (const s of config.stats.hidden) initialStats[s.id] = s.start;

  const initialThreads = [options.origin, options.don].filter((t): t is string => !!t);

  const state = createInitialState({
    seed,
    initialAge: config.career.startAge,
    initialStats,
    baseCap: config.career.noteCap,
    initialThreads,
  });

  const rng = createRng(seed);
  return { state, rng };
}

export type NextStep =
  | { kind: "event"; event: Event; choices: Choice[] }
  | { kind: "over"; legacy: LegacyResult };

const MAX_AGE = 40;

/**
 * Trouve le prochain événement jouable en avançant l'âge si besoin (une
 * saison = un an, tant que rien n'est éligible). S'arrête à MAX_AGE et
 * calcule la légende finale — c'est la fin de partie du prototype.
 */
export function findNextStep(state: CareerState, pool: Event[], rng: Rng): { step: NextStep; state: CareerState } {
  let cursor = state;

  while (cursor.age <= MAX_AGE) {
    const event = resolveScriptedEvent(cursor, pool) ?? resolveRandomEvent(cursor, pool, rng);
    if (event) {
      const choices = eligibleChoices(cursor, event);
      return { step: { kind: "event", event, choices }, state: cursor };
    }
    cursor = advanceSeason(advanceAge(cursor, 1));
  }

  const legacy = computeLegacy(cursor, {
    statWeights: config.stats.note.weights,
    tiers: config.legacyTiers,
  });
  return { step: { kind: "over", legacy }, state: cursor };
}

export function pickChoice(
  state: CareerState,
  event: Event,
  choice: Choice,
  rng: Rng
): { state: CareerState; outcomeText: string; resolvedSuccess?: boolean } {
  const result = applyChoice(state, event, choice, rng);
  return result;
}

export function getEventPool(): Event[] {
  return events;
}

export function getConfig(): GameConfig {
  return config;
}
