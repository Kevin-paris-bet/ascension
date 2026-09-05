import assert from "node:assert/strict";
import { createCareer, findNextStep, getEventPool, getCreationSteps, pickChoice, finishCareer, grantCareerExtension } from "../lib/engineBridge";
import { generateAcademyOffers, startFootballCareer, simulateSeason, returnFromLoanIfDue, generateInternationalOffer, acceptInternationalOffer, declineInternationalOffer, shouldOpenTransferWindow, generateTransferOffers, acceptClubOffer } from "../lib/footballCareer";

function run(seed: string, strategy: number) {
  const selections: Record<string,string> = {};
  for (const step of getCreationSteps()) if (step.options?.length) selections[step.id] = step.options[strategy % step.options.length].id;
  const created = createCareer(selections, seed);
  const rng = created.rng;
  const started = startFootballCareer(created.state, generateAcademyOffers(created.state)[strategy % 3]);
  let state = started.state;
  let football = started.career;
  let count = 0;
  for (; count < 250; count++) {
    const before = state;
    const next = findNextStep(state, getEventPool(), rng);
    state = next.state;
    for (let offset = 1; offset <= state.season - before.season; offset++) {
      football = simulateSeason({ ...before, age: before.age + offset, season: before.season + offset }, football, rng);
    }
    if (state.season > before.season) {
      const returned = returnFromLoanIfDue(state, football);
      state = returned.state; football = returned.career;
      const offer = generateInternationalOffer(state, football);
      if (offer) {
        const decision = strategy % 2 ? declineInternationalOffer(state, football) : acceptInternationalOffer(state, football, offer);
        state = decision.state; football = decision.career;
      }
      if (next.step.kind === "event" && shouldOpenTransferWindow(state, football)) {
        const offers = generateTransferOffers(state, football);
        assert(offers.length > 0);
        const accepted = acceptClubOffer(state, football, offers[strategy % offers.length]);
        state = accepted.state; football = accepted.career;
      }
    }
    for (const value of Object.values(state.stats)) assert(Number.isFinite(value) && value >= 0 && value <= 100);
    assert(new Set(football.seasons.map(s => s.season)).size === football.seasons.length, "une seule simulation par saison");
    if (next.step.kind === "over") break;
    if (next.step.kind === "retirement_offer") {
      if (strategy % 2 === 0) break;
      state = grantCareerExtension(state);
      continue;
    }
    const choices = next.step.choices.filter(c => !c.rewarded);
    assert(choices.length > 0, `${next.step.event.id}: choix gratuit obligatoire`);
    state = pickChoice(state, next.step.event, choices[strategy % choices.length], rng).state;
  }
  assert(count < 250, "la carrière doit se terminer");
  const final = finishCareer(state).legacy;
  assert(Number.isFinite(final.note) && final.note >= 0 && final.note <= 100);
  return JSON.stringify({ state: { age: state.age, stats: state.stats, history: state.history }, football, final });
}
for (let i = 0; i < 300; i++) {
  const seed = `ui-journey-${i}`;
  const result = run(seed, i);
  if (i < 12) assert.equal(run(seed, i), result, "rejouer la même carrière doit être déterministe");
}
console.log("✓ 300 parcours du moteur utilisé par l’interface : choix gratuits, saisons, prêts, mercato, sélection, retraite, notes bornées et déterminisme");
