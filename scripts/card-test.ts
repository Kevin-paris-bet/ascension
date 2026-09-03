import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { EventSchema, type Event } from "../engine/schema";
import { createInitialState, advanceSeason, type CareerState } from "../engine/state";
import { resolveScriptedEvent, resolveRandomEvent, eligibleChoices } from "../engine/resolver";
import { applyChoice, advanceAge } from "../engine/progression";
import { computeLegacy } from "../engine/legacy";
import { createRng } from "../engine/rng";
import { buildLegacyCard } from "../lib/legacyCard";
import { shouldRetire } from "../engine/retirement";

const dir = "content/fr-football/events";
const pool: Event[] = readdirSync(dir).filter(f => f.endsWith(".json"))
  .map(f => EventSchema.parse(JSON.parse(readFileSync(join(dir, f), "utf8"))));
const config = JSON.parse(readFileSync("content/fr-football/config.json", "utf8"));
const creation = JSON.parse(readFileSync("content/fr-football/creation.json", "utf8"));

function run(seed: string) {
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
  let n = 0;
  const retire = config.career.retirement;
  while (state.age <= retire.maxAge && n < 200) {
    const ev = resolveScriptedEvent(state, pool) ?? resolveRandomEvent(state, pool, rng);
    if (!ev) {
      state = advanceSeason(advanceAge(state, 1));
      if (shouldRetire(state, retire, rng)) break;
      continue;
    }
    let ch = ev.kind === "outcome" ? ev.choices.filter(c => c.forced).slice(0, 1) : eligibleChoices(state, ev);
    if (!ch.length) ch = ev.choices.slice(0, 1);
    state = applyChoice(state, ev, ch[rng.int(0, ch.length - 1)], rng).state;
    n++;
  }
  const legacy = computeLegacy(state, { statWeights: config.stats.note.weights, tiers: config.legacyTiers });
  return buildLegacyCard(state, legacy, { name: "Karim Benali", number: 10 });
}

console.log("\n  Cartes générées sur 6 carrières\n");
for (const s of ["carte-1","carte-2","carte-3","carte-4","carte-5","carte-6"]) {
  const c = run(s);
  console.log(`  ${c.position.padEnd(10)} ${String(c.seasons).padStart(2)} saisons · ${String(c.matches).padStart(3)} matchs · ${String(c.goals).padStart(3)} buts · ${String(c.assists).padStart(3)} pd · ${String(c.caps).padStart(3)} sél.`);
  console.log(`  → ${c.note} ${c.tier}${c.nickname ? ` « ${c.nickname} »` : ""}  [${c.honours.join(" · ") || "aucun palmarès"}]`);
  console.log("");
}

// Déterminisme de la carte
const x = run("determ-card"), y = run("determ-card");
const identical = JSON.stringify(x) === JSON.stringify(y);
console.log(`  Déterminisme de la carte : ${identical ? "OK" : "ÉCHEC"}`);

// Plausibilité sur 200 cartes
let bad = 0, noHonours = 0, tooManyGoals = 0;
const ratios: number[] = [];
for (let i = 0; i < 200; i++) {
  const c = run(`plaus-${i}`);
  if (c.matches < 0 || c.goals < 0 || c.seasons < 0 || c.goals > c.matches * 1.2) bad++;
  if (c.position !== "Gardien" && c.matches > 0 && c.goals / c.matches > 0.95) tooManyGoals++;
  if (c.honours.length === 0) noHonours++;
  if (c.matches > 0) ratios.push(c.goals / c.matches);
}
console.log(`  Valeurs aberrantes : ${bad}`);
console.log(`  Ratio buts/match hors norme : ${tooManyGoals}`);
console.log(`  Cartes sans aucun palmarès : ${noHonours}/200 (${(noHonours/2).toFixed(0)}%)`);
console.log(`  Ratio buts/match moyen : ${(ratios.reduce((a,b)=>a+b,0)/ratios.length).toFixed(2)}`);

const nicks: Record<string, number> = {};
const honourCounts: Record<number, number> = {};
const seasonsDist: number[] = [];
for (let i = 0; i < 200; i++) {
  const c = run(`variete-${i}`);
  const k = c.nickname ?? "(aucun)";
  nicks[k] = (nicks[k] ?? 0) + 1;
  honourCounts[c.honours.length] = (honourCounts[c.honours.length] ?? 0) + 1;
  seasonsDist.push(c.seasons);
}
console.log(`\n  Variété des surnoms sur 200 cartes :`);
for (const [k, n] of Object.entries(nicks).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${k.padEnd(20)} ${String(n).padStart(3)}  ${"█".repeat(Math.round(n / 4))}`);
}
console.log(`\n  Lignes de palmarès : ${Object.entries(honourCounts).map(([k, v]) => `${k}→${v}`).join("  ")}`);
const ss = [...seasonsDist].sort((a, b) => a - b);
console.log(`  Saisons : min ${ss[0]}  médiane ${ss[100]}  max ${ss[199]}`);
