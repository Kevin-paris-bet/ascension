import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { EventSchema, type Event } from "../engine/schema";
import { createInitialState, advanceSeason, type CareerState } from "../engine/state";
import { resolveScriptedEvent, resolveRandomEvent, eligibleChoices } from "../engine/resolver";
import { applyChoice, advanceAge } from "../engine/progression";
import { computeLegacy } from "../engine/legacy";
import { createRng } from "../engine/rng";

const dir = "content/fr-football/events";
const pool: Event[] = readdirSync(dir).filter(f => f.endsWith(".json"))
  .map(f => EventSchema.parse(JSON.parse(readFileSync(join(dir, f), "utf8"))));
const config = JSON.parse(readFileSync("content/fr-football/config.json", "utf8"));
const creation = JSON.parse(readFileSync("content/fr-football/creation.json", "utf8"));
const pack = JSON.parse(readFileSync("content/fr-football/pack.json", "utf8"));

const MAX_AGE = 40;
const callbackThreads: string[] = pack.callbacks.map((c: any) => c.thread);

function runCareer(seed: string, verbose = false) {
  const rng = createRng(seed);
  const stats: Record<string, number> = {};
  for (const s of [...config.stats.visible, ...config.stats.hidden]) stats[s.id] = s.start;
  const threads: string[] = [];

  for (const step of creation.steps) {
    if (!step.options) continue;
    const opt = step.options[rng.int(0, step.options.length - 1)];
    for (const [k, v] of Object.entries(opt.effects?.stats ?? {})) stats[k] = (stats[k] ?? 0) + (v as number);
    for (const t of opt.effects?.threads ?? []) threads.push(t);
    for (const [t, p] of Object.entries(opt.threadChance ?? {})) if (rng.next() < (p as number)) threads.push(t);
  }

  let state: CareerState = createInitialState({
    seed, initialAge: config.career.startAge, initialStats: stats,
    baseCap: config.career.noteCap, initialThreads: threads,
  });

  const opened = new Set<string>();
  const resolved = new Set<string>();
  let screens = 0;

  while (state.age <= MAX_AGE && screens < 200) {
    const event = resolveScriptedEvent(state, pool) ?? resolveRandomEvent(state, pool, rng);
    if (!event) { state = advanceSeason(advanceAge(state, 1)); continue; }

    let choices = event.kind === "outcome"
      ? event.choices.filter(c => c.forced).slice(0, 1)
      : eligibleChoices(state, event);
    if (choices.length === 0) choices = event.choices.slice(0, 1);

    const choice = choices[rng.int(0, choices.length - 1)];
    const before = new Set(state.threads);
    const beforeLvl = new Set(Object.keys(state.threadLevels));
    const r = applyChoice(state, event, choice, rng);
    state = r.state;
    screens++;

    for (const t of callbackThreads) {
      // Un callback peut s'appuyer sur un thread posé OU sur un compteur cumulatif.
      const hadIt = before.has(t) || beforeLvl.has(t);
      const hasIt = state.threads.has(t) || state.threadLevels[t] !== undefined;
      if (!hadIt && hasIt) opened.add(t);
      if (hadIt && !hasIt) resolved.add(t);
    }
    if (verbose) console.log(`  [${state.age}] ${event.id} → ${choice.id}`);
  }

  const legacy = computeLegacy(state, { statWeights: config.stats.note.weights, tiers: config.legacyTiers });
  return { screens, legacy, opened, resolved, threads: state.threads.size, age: state.age };
}

// --- Déterminisme
const a = runCareer("determinisme-001");
const b = runCareer("determinisme-001");
const same = a.screens === b.screens && a.legacy.note === b.legacy.note && a.legacy.quote === b.legacy.quote;
console.log(`\n  Déterminisme (même seed → même carrière) : ${same ? "OK" : "ÉCHEC"}`);

// --- Une carrière détaillée
console.log(`\n  Carrière exemple (seed "demo-042") :`);
const demo = runCareer("demo-042", true);
console.log(`\n  → ${demo.screens} écrans, note ${demo.legacy.note}, tier ${demo.legacy.tier}`);
console.log(`  → « ${demo.legacy.quote.slice(0, 80)}… »`);

// --- 300 carrières : statistiques d'intégrité
let totalScreens = 0, minS = 999, maxS = 0;
const openedCount: Record<string, number> = {};
const unresolvedCount: Record<string, number> = {};
const notes: number[] = [];
const tiers: Record<string, number> = {};

for (let i = 0; i < 300; i++) {
  const r = runCareer(`bulk-${i}`);
  totalScreens += r.screens;
  minS = Math.min(minS, r.screens); maxS = Math.max(maxS, r.screens);
  notes.push(r.legacy.note);
  tiers[r.legacy.tier] = (tiers[r.legacy.tier] ?? 0) + 1;
  for (const t of r.opened) {
    openedCount[t] = (openedCount[t] ?? 0) + 1;
    if (!r.resolved.has(t)) unresolvedCount[t] = (unresolvedCount[t] ?? 0) + 1;
  }
}

console.log(`\n  300 carrières simulées`);
console.log(`  Écrans par carrière : ${(totalScreens / 300).toFixed(1)} en moyenne (min ${minS}, max ${maxS})`);
console.log(`  Durée estimée : ~${((totalScreens / 300) * 8 / 60).toFixed(1)} min à 8s par écran`);
console.log(`  Note moyenne : ${(notes.reduce((a, b) => a + b, 0) / notes.length).toFixed(1)}`);
console.log(`\n  Répartition des tiers :`);
for (const [t, n] of Object.entries(tiers).sort((x, y) => y[1] - x[1])) {
  console.log(`    ${t.padEnd(12)} ${String(n).padStart(3)}  ${"█".repeat(Math.round(n / 4))}`);
}

console.log(`\n  Callbacks — promesses narratives tenues :`);
let broken = 0;
for (const t of callbackThreads) {
  const o = openedCount[t] ?? 0;
  const u = unresolvedCount[t] ?? 0;
  const rate = o > 0 ? (((o - u) / o) * 100).toFixed(0) : "—";
  if (u > 0) broken += u;
  console.log(`    ${t.padEnd(20)} ouvert ${String(o).padStart(3)}×  résolu ${String(rate).padStart(3)}%${u > 0 ? `  ⚠ ${u} non tenus` : ""}`);
}

const sorted = [...notes].sort((a, b) => a - b);
const pct = (p: number) => sorted[Math.floor(sorted.length * p)];
console.log(`\n  Distribution des notes : min ${sorted[0]}  p25 ${pct(0.25)}  médiane ${pct(0.5)}  p75 ${pct(0.75)}  p90 ${pct(0.9)}  max ${sorted[sorted.length-1]}`);

console.log(`\n  ${broken === 0 ? "✓ Aucune promesse narrative non tenue sur 300 carrières." : `⚠ ${broken} promesses non tenues.`}`);
