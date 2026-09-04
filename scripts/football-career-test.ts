import assert from "node:assert/strict";
import { createInitialState } from "../engine/state";
import { createRng } from "../engine/rng";
import {
  acceptClubOffer,
  generateAcademyOffers,
  generateTransferOffers,
  getClubs,
  getLeague,
  getLeagues,
  simulateSeason,
  startFootballCareer,
} from "../lib/footballCareer";

const leagues = getLeagues();
const clubs = getClubs();
assert.equal(leagues.length, 7, "le monde doit proposer 7 championnats");
assert.equal(clubs.length, 42, "le monde doit proposer 42 clubs");
assert.equal(new Set(leagues.map((league) => league.id)).size, leagues.length, "les ids de championnats doivent être uniques");
assert.equal(new Set(clubs.map((club) => club.id)).size, clubs.length, "les ids de clubs doivent être uniques");
for (const club of clubs) assert.doesNotThrow(() => getLeague(club.leagueId), `${club.name} référence un championnat inconnu`);

const base = createInitialState({
  seed: "football-system-001",
  initialAge: 14,
  initialStats: { technique: 58, physique: 55, vista: 61, mental: 57, aura: 42, vestiaire: 50 },
  baseCap: 96,
  initialThreads: ["poste:milieu"],
});
const academyOffers = generateAcademyOffers(base);
assert.equal(academyOffers.length, 3, "trois clubs doivent recruter le joueur au départ");
assert.equal(new Set(academyOffers.map((offer) => offer.clubId)).size, 3, "les offres initiales doivent être distinctes");

const started = startFootballCareer(base, academyOffers[0]);
assert.equal(started.state.org, academyOffers[0].clubId);
assert.equal(started.career.clubHistory.length, 1);

const seasonState = { ...started.state, age: 18, season: 4 };
const seasonA = simulateSeason(seasonState, started.career, createRng("season-result"));
const seasonB = simulateSeason(seasonState, started.career, createRng("season-result"));
assert.deepEqual(seasonA, seasonB, "une saison doit être reproductible avec la même seed");
const summary = seasonA.seasons[0];
assert(summary.appearances >= summary.starts, "les apparitions ne peuvent pas être inférieures aux titularisations");
assert(summary.tableFinish >= 1 && summary.tableFinish <= summary.tableSize, "le classement doit rester dans les bornes");
assert(summary.averageRating >= 5.2 && summary.averageRating <= 9.4, "la note moyenne doit rester réaliste");

const offers = generateTransferOffers(seasonState, seasonA);
assert.equal(offers.length, 4, "le mercato doit proposer une prolongation et trois clubs");
assert.equal(offers.filter((offer) => offer.moveType !== "stay").length, 3);
assert.equal(new Set(offers.map((offer) => offer.clubId)).size, 4, "les clubs du mercato doivent être distincts");
const accepted = acceptClubOffer(seasonState, seasonA, offers[1]);
assert.equal(accepted.career.currentClubId, offers[1].clubId);
assert.equal(accepted.career.clubHistory.length, 2, "un transfert doit être ajouté au parcours");
assert.equal(accepted.career.clubHistory[0].toSeason, seasonState.season, "le passage précédent doit être clôturé");

console.log(`  ✓ football : ${leagues.length} championnats, ${clubs.length} clubs, saisons et mercato déterministes`);
