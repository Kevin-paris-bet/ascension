"use client";

import { createInitialState, advanceSeason, type CareerState } from "@/engine/state";
import { resolveScriptedEvent, resolveRandomEvent, eligibleChoices } from "@/engine/resolver";
import { applyChoice, advanceAge } from "@/engine/progression";
import { computeLegacy, type LegacyResult } from "@/engine/legacy";
import { shouldRetire, type RetirementConfig } from "@/engine/retirement";
import { createRng, type Rng } from "@/engine/rng";
import type { Event, Choice } from "@/engine/schema";
import { events } from "@/content/fr-football/events/index";
import config from "@/content/fr-football/config.json";
import creation from "@/content/fr-football/creation.json";

export type GameConfig = typeof config;

/** Option retenue à la création, par identifiant d'étape. */
export type CreationSelection = Record<string, string>;

function randomSeed(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function getCreationSteps() {
  return creation.steps;
}

/**
 * Construit l'état initial depuis les choix de création. Les threads d'origine
 * (origine:cite, precarite_familiale...) sont posés ici — c'est ce qui rend
 * accessibles les choix conditionnels de l'Acte I.
 */
export function createCareer(selection: CreationSelection, seed?: string): { state: CareerState; rng: Rng } {
  const finalSeed = seed ?? randomSeed();
  const rng = createRng(finalSeed);

  const initialStats: Record<string, number> = {};
  for (const s of config.stats.visible) initialStats[s.id] = s.start;
  for (const s of config.stats.hidden) initialStats[s.id] = s.start;

  const initialThreads: string[] = [];

  for (const step of creation.steps) {
    const chosenId = selection[step.id];
    if (!chosenId) continue;
    const options = (step as { options?: Array<Record<string, unknown>> }).options;
    if (!options) continue;
    const option = options.find((o) => o.id === chosenId) as
      | { effects?: { stats?: Record<string, number>; threads?: string[] }; threadChance?: Record<string, number> }
      | undefined;
    if (!option) continue;

    for (const [stat, delta] of Object.entries(option.effects?.stats ?? {})) {
      initialStats[stat] = (initialStats[stat] ?? 0) + delta;
    }
    for (const t of option.effects?.threads ?? []) initialThreads.push(t);

    // Threads probabilistes : precarite_familiale n'est pas garanti par l'origine.
    for (const [thread, probability] of Object.entries(option.threadChance ?? {})) {
      if (rng.next() < probability) initialThreads.push(thread);
    }
  }

  const state = createInitialState({
    seed: finalSeed,
    initialAge: config.career.startAge,
    initialStats,
    baseCap: config.career.noteCap,
    initialThreads,
  });

  return { state, rng };
}

export type NextStep =
  | { kind: "event"; event: Event; choices: Choice[] }
  | { kind: "over"; legacy: LegacyResult };

const retirementConfig = config.career.retirement as RetirementConfig;

/**
 * Un écran `outcome` n'offre pas de choix : la branche est imposée par l'état
 * (la signature pro aboutit ou non selon ce que le joueur a construit). On
 * retient la branche `forced` correspondante, et on n'expose l'emplacement
 * `rewarded` que sur l'échec — c'est là que le joueur *demande* la publicité.
 */
export function resolveOutcomeBranch(state: CareerState, event: Event): Choice[] {
  const forced = event.choices.filter((c) => c.forced);
  const rewarded = event.choices.filter((c) => c.rewarded);

  const dossier =
    (state.stats.technique ?? 0) +
    (state.stats.mental ?? 0) +
    (state.stats.vista ?? 0) +
    (state.stats.physique ?? 0);
  const succeeds = dossier >= 200;

  const picked = succeeds ? forced[0] : forced[forced.length - 1];
  const branches = picked ? [picked] : [];
  return succeeds ? branches : [...branches, ...rewarded];
}

export function findNextStep(state: CareerState, pool: Event[], rng: Rng): { step: NextStep; state: CareerState } {
  let cursor = state;

  while (cursor.age <= retirementConfig.maxAge) {
    const event = resolveScriptedEvent(cursor, pool) ?? resolveRandomEvent(cursor, pool, rng);
    if (event) {
      const choices =
        event.kind === "outcome" ? resolveOutcomeBranch(cursor, event) : eligibleChoices(cursor, event);
      return { step: { kind: "event", event, choices }, state: cursor };
    }
    cursor = advanceSeason(advanceAge(cursor, 1));
    // La retraite se joue entre deux saisons, une fois les événements de
    // l'année écoulés — sinon on couperait une carrière au milieu d'un arc.
    if (shouldRetire(cursor, retirementConfig, rng)) break;
  }

  const legacy = computeLegacy(cursor, {
    statWeights: config.stats.note.weights,
    tiers: config.legacyTiers,
  });
  return { step: { kind: "over", legacy }, state: cursor };
}

export function pickChoice(state: CareerState, event: Event, choice: Choice, rng: Rng) {
  return applyChoice(state, event, choice, rng);
}

export function getEventPool(): Event[] {
  return events;
}

export function getConfig(): GameConfig {
  return config;
}
