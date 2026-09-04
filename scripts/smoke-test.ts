import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";
import { EventSchema, type Event } from "../engine/schema";
import { createInitialState } from "../engine/state";
import { resolveScriptedEvent, resolveRandomEvent, eligibleChoices, isEventEligible } from "../engine/resolver";
import { applyChoice } from "../engine/progression";
import { computeLegacy } from "../engine/legacy";
import { createRng } from "../engine/rng";
import { deserializeCareerState, serializeCareerState } from "../engine/serialization";
import { parseLegacySummary } from "../lib/careerResult";

{
  const validSummary = {
    name: "K. Diallo", number: 10, nickname: null, position: "Milieu", origin: "Paris",
    seasons: 14, matches: 382, goals: 74, assists: 129, caps: 61, cleanSheets: 0,
    honours: ["Champion"], note: 91, tier: "Légende", quote: "Une trace durable.", seed: "archive-1",
  };
  assert.deepEqual(parseLegacySummary(validSummary), validSummary, "un résumé de carrière valide doit être accepté");
  assert.equal(parseLegacySummary({ ...validSummary, note: "91" }), null, "une donnée JSON mal typée doit être rejetée");
  console.log("  [library] validation des archives JSON vérifiée");
}

const eventsDir = join("content/fr-football/events");
const pool: Event[] = readdirSync(eventsDir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => EventSchema.parse(JSON.parse(readFileSync(join(eventsDir, f), "utf8"))));

console.log(`\n  Smoke test — ${pool.length} événements chargés\n`);

// Une sauvegarde doit reprendre au tirage suivant, et non recommencer la seed.
{
  const first = createRng("resume-seed");
  first.next();
  const checkpoint = first.getState();
  const expectedNext = first.next();
  const restored = createRng("resume-seed", checkpoint);
  assert.equal(restored.next(), expectedNext, "le PRNG restauré diverge après la sauvegarde");
  assert.notEqual(checkpoint, createRng("resume-seed").getState(), "l'état du PRNG ne progresse pas");
  console.log("  [save] reprise déterministe du PRNG vérifiée");
}

const rng = createRng("smoke-test-seed-001");

let state = createInitialState({
  seed: "smoke-test-seed-001",
  initialAge: 14,
  initialStats: { technique: 50, physique: 50, vista: 50, mental: 50, aura: 50, vestiaire: 50, compte: 20 },
  baseCap: 96,
  // On sème 'precarite_familiale' pour activer la branche qui pose 'dette_morale'
  // et exercer tout le cycle callback (pose en acte I, résolution en acte III).
  initialThreads: ["precarite_familiale"],
});

{
  const roundTrip = deserializeCareerState(serializeCareerState(state));
  assert.deepEqual([...roundTrip.threads], [...state.threads]);
  assert.deepEqual([...roundTrip.played], [...state.played]);
  assert.deepEqual(roundTrip.stats, state.stats);
  console.log("  [save] sérialisation de carrière vérifiée");
}

function log(label: string, event: Event, choiceId: string, outcome: string, success?: boolean) {
  const tag = success === undefined ? "" : success ? " (réussite)" : " (échec)";
  console.log(`  [${state.age} ans] ${event.id} → ${choiceId}${tag}`);
  console.log(`    "${outcome.slice(0, 90)}${outcome.length > 90 ? "…" : ""}"`);
}

// --- Étape 1 : a1_sacrifice à 14 ans, on choisit 'seul' pour exercer la résolution à variance
{
  const event = resolveScriptedEvent(state, pool);
  if (!event) throw new Error("a1_sacrifice introuvable à 14 ans — le resolver ne fonctionne pas");
  const choices = eligibleChoices(state, event);
  const choice = choices.find((c) => c.id === "seul")!;
  const result = applyChoice(state, event, choice, rng);
  state = result.state;
  log("a1_sacrifice", event, choice.id, result.outcomeText, result.resolvedSuccess);
}

// --- Étape 2 : a1_tentation à 16 ans — on choisit 'enveloppe' (nécessite precarite_familiale), pose dette_morale
state = { ...state, age: 16 };
{
  // Plusieurs événements partagent l'âge 16 et s'enchaînent un par écran :
  // on cible explicitement celui qui pose le callback qu'on veut tester.
  const event = pool.find((e) => e.id === "a1_tentation");
  if (!event) throw new Error("a1_tentation introuvable dans le pool");
  if (!isEventEligible(state, event)) throw new Error("a1_tentation non éligible à 16 ans");
  const choices = eligibleChoices(state, event);
  const envelope = choices.find((c) => c.id === "enveloppe");
  if (!envelope) throw new Error("le choix conditionnel 'enveloppe' n'est pas remonté — matchesRequires cassé");
  const result = applyChoice(state, event, envelope, rng);
  state = result.state;
  log("a1_tentation", event, envelope.id, result.outcomeText);
  if (!state.threads.has("dette_morale")) throw new Error("le thread 'dette_morale' n'a pas été posé");
}

// --- Étape 3 : à 24 ans, a3_dette doit être éligible (thread requis présent) et résoudre le callback
state = { ...state, age: 24 };
{
  const event = pool.find((e) => e.id === "a3_dette");
  if (!event) throw new Error("a3_dette introuvable dans le pool");
  if (!isEventEligible(state, event)) {
    throw new Error("a3_dette non éligible à 24 ans — le callback n'est pas atteignable, régression du moteur de cohérence");
  }
  const choices = eligibleChoices(state, event);
  const choice = choices.find((c) => c.id === "panache")!;
  const result = applyChoice(state, event, choice, rng);
  state = result.state;
  log("a3_dette", event, choice.id, result.outcomeText);
  if (state.threads.has("dette_morale")) throw new Error("le callback 'dette_morale' aurait dû être résolu (threadsResolve)");
}

// --- Étape 4 : verrouillage — on pose un lock explicite et on vérifie qu'il bloque bien un événement
{
  const locked: Event = {
    ...pool[0],
    id: "test_evt_verrouille",
    ageWindow: [24, 24],
  };
  const testPool = [...pool, locked];
  state = { ...state, locks: { ...state.locks, test_evt_verrouille: 2 } };
  const eligible = resolveRandomEvent(state, testPool, rng);
  if (eligible?.id === "test_evt_verrouille") throw new Error("un événement verrouillé a été tiré — locks cassé");
  console.log(`  [lock] test_evt_verrouille correctement exclu du tirage pendant qu'il est verrouillé`);
}

// --- Étape 5 : légende finale
const legacy = computeLegacy(state, {
  statWeights: { technique: 1, physique: 1, vista: 1, mental: 1, aura: 1 },
  tiers: [
    { min: 0, label: "Oublié" },
    { min: 40, label: "Solide" },
    { min: 60, label: "Reconnu" },
    { min: 80, label: "Légende" },
  ],
});

console.log(`\n  Note finale : ${legacy.note} / ${state.cap}`);
console.log(`  Tier        : ${legacy.tier}`);
console.log(`  Citation    : "${legacy.quote}"`);
console.log(`  Seed        : ${state.seed} — rejouer la même seed + mêmes choix doit reproduire ce résultat exact\n`);

console.log("  ✓ smoke test complet : resolver, progression, callbacks, locks et legacy fonctionnent ensemble\n");
