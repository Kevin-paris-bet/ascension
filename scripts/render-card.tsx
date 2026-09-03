/**
 * Rend la carte en SVG puis en PNG, hors navigateur. Sert à vérifier
 * visuellement le rendu sans lancer le serveur de dev.
 * Usage : npx tsx scripts/render-card.tsx <seed>
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { EventSchema, type Event } from "../engine/schema";
import { createInitialState, advanceSeason, type CareerState } from "../engine/state";
import { resolveScriptedEvent, resolveRandomEvent, eligibleChoices } from "../engine/resolver";
import { applyChoice, advanceAge } from "../engine/progression";
import { computeLegacy } from "../engine/legacy";
import { createRng } from "../engine/rng";
import { shouldRetire } from "../engine/retirement";
import { buildLegacyCard } from "../lib/legacyCard";
import { LegacyCard, CARD_WIDTH, CARD_HEIGHT } from "../app/components/LegacyCard";

const dir = "content/fr-football/events";
const pool: Event[] = readdirSync(dir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => EventSchema.parse(JSON.parse(readFileSync(join(dir, f), "utf8"))));
const config = JSON.parse(readFileSync("content/fr-football/config.json", "utf8"));
const creation = JSON.parse(readFileSync("content/fr-football/creation.json", "utf8"));

const seed = process.argv[2] ?? "render-demo";
const playerName = process.argv[3] ?? "Karim Benali";

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
  seed,
  initialAge: config.career.startAge,
  initialStats: stats,
  baseCap: config.career.noteCap,
  initialThreads: threads,
});

const retire = config.career.retirement;
let n = 0;
while (state.age <= retire.maxAge && n < 200) {
  const ev = resolveScriptedEvent(state, pool) ?? resolveRandomEvent(state, pool, rng);
  if (!ev) {
    state = advanceSeason(advanceAge(state, 1));
    if (shouldRetire(state, retire, rng)) break;
    continue;
  }
  let ch = ev.kind === "outcome" ? ev.choices.filter((c) => c.forced).slice(0, 1) : eligibleChoices(state, ev);
  if (!ch.length) ch = ev.choices.slice(0, 1);
  state = applyChoice(state, ev, ch[rng.int(0, ch.length - 1)], rng).state;
  n++;
}

const legacy = computeLegacy(state, { statWeights: config.stats.note.weights, tiers: config.legacyTiers });
const data = buildLegacyCard(state, legacy, { name: playerName, number: 10 });

// Le composant est dimensionné en CSS (width:100%) pour l'affichage dans la
// page. Hors navigateur, il faut des attributs width/height explicites, sinon
// le rastériseur ne sait pas quelle taille produire — c'est exactement la
// correction que cardToPngBlob applique côté client.
const svg = renderToStaticMarkup(LegacyCard({ data }) as never)
  .replace(/ style="[^"]*"/, "")
  .replace("<svg ", `<svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" `);
writeFileSync(`/tmp/card-${seed}.svg`, svg);

console.log(`  ${data.name} #${data.number}${data.nickname ? ` « ${data.nickname} »` : ""}`);
console.log(`  ${data.position} · ${data.origin} · ${data.seasons} saisons · ${data.matches} matchs`);
console.log(`  ${data.note} ${data.tier} · ${data.honours.join(" · ")}`);
console.log(`  SVG écrit : /tmp/card-${seed}.svg`);
