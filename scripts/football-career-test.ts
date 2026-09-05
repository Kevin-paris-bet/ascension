import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createInitialState } from "../engine/state";
import { createRng } from "../engine/rng";
import {
  acceptClubOffer,
  acceptInternationalOffer,
  declineInternationalOffer,
  generateAcademyOffers,
  generateInternationalOffer,
  generateTransferOffers,
  getClub,
  getClubs,
  getLeague,
  getLeagues,
  normalizeFootballCareer,
  returnFromLoanIfDue,
  simulateSeason,
  startFootballCareer,
} from "../lib/footballCareer";
import { getNationalTeams } from "../lib/nationalTeams";

const leagues = getLeagues();
const clubs = getClubs();
assert.equal(leagues.length, 26, "le monde doit proposer 26 championnats");
assert.equal(clubs.length, 156, "le monde doit proposer 156 clubs");
assert(leagues.every((league) => league.tableSize === 20), "tous les championnats doivent simuler exactement 20 équipes");
assert.equal(new Set(leagues.map((league) => league.id)).size, leagues.length, "les ids de championnats doivent être uniques");
assert.equal(new Set(clubs.map((club) => club.id)).size, clubs.length, "les ids de clubs doivent être uniques");
const legacyClubIdFingerprint = createHash("sha256").update(clubs.map((club) => club.id).join("\n")).digest("hex");
assert.equal(
  legacyClubIdFingerprint,
  "681488c9e9dbb86233453a38cdaf05dc9c045b4a801f4ae8c5d156dfe24425c2",
  "les 156 ids historiques doivent rester strictement stables pour les anciennes sauvegardes"
);
assert.equal(new Set(clubs.map((club) => club.name)).size, clubs.length, "les noms affichés des clubs doivent être uniques");
for (const club of clubs) assert.doesNotThrow(() => getLeague(club.leagueId), `${club.name} référence un championnat inconnu`);
const previousClubIds = [
  "paris-athletique", "olympique-massilia", "racing-riviera", "lille-metropole", "as-lumiere", "union-armorique",
  "fc-bastide", "sporting-normand", "etoile-alsace", "ac-loire", "red-star-garonne", "rc-flandres",
  "london-kings", "manchester-forge", "mersey-rovers", "northbridge-united", "thames-athletic", "brighton-south",
  "real-castilla", "barcelona-maritim", "atletico-capital", "sevilla-aurora", "valencia-turia", "bilbao-harria",
  "milano-scala", "torino-regale", "inter-lombardia", "roma-imperiale", "napoli-vesuvio", "firenze-viola",
  "munchen-adler", "dortmund-west", "rhein-werk", "leipzig-energie", "berlin-union", "hamburg-hansa",
  "lisboa-imperio", "porto-dragao", "sporting-tejo", "braga-arsenal", "vitoria-minho", "farense-sul",
];
for (const id of previousClubIds) assert.doesNotThrow(() => getClub(id), `une ancienne sauvegarde ne retrouve plus le club ${id}`);
for (const country of ["France", "Angleterre", "Espagne", "Italie", "Allemagne"]) {
  assert.deepEqual(leagues.filter((league) => league.country === country).map((league) => league.tier).sort(), [1, 2], `${country} doit avoir une D1 et une D2`);
}
for (const country of ["Arabie saoudite", "Brésil", "Argentine"]) {
  assert(leagues.some((league) => league.country === country && league.tier === 1), `${country} doit avoir une première division`);
}
const displayedFlagCodes = new Set([
  ...leagues.map((league) => league.flagCode),
  ...getNationalTeams().map((team) => team.flagCode),
]);
for (const code of displayedFlagCodes) {
  assert(
    existsSync(resolve("node_modules", "flag-icons", "flags", "4x3", `${code}.svg`)),
    `le drapeau SVG ${code} doit exister dans flag-icons`
  );
}

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

const started = startFootballCareer(base, academyOffers[0], "mali");
assert.equal(started.state.org, academyOffers[0].clubId);
assert.equal(started.career.clubHistory.length, 1);

const seasonState = { ...started.state, age: 18, season: 4 };
const seasonA = simulateSeason(seasonState, started.career, createRng("season-result"));
const seasonB = simulateSeason(seasonState, started.career, createRng("season-result"));
assert.deepEqual(seasonA, seasonB, "une saison doit être reproductible avec la même seed");
const summary = seasonA.seasons[0];
assert(summary.appearances >= summary.starts, "les apparitions ne peuvent pas être inférieures aux titularisations");
assert.equal(summary.tableSize, 20, "un bilan de saison doit toujours afficher un classement sur 20 équipes");
assert(summary.tableFinish >= 1 && summary.tableFinish <= summary.tableSize, "le classement doit rester dans les bornes");
assert(summary.averageRating >= 5.2 && summary.averageRating <= 9.4, "la note moyenne doit rester réaliste");
assert(summary.domesticCup.appearances >= 1, "la coupe nationale doit être simulée");
assert(Array.isArray(summary.individualAwards), "les distinctions individuelles doivent être calculées");
const migratedCareer = normalizeFootballCareer({ ...seasonA, seasons: [{ ...summary, tableFinish: 5, tableSize: 6 }] }, "mali");
assert.equal(migratedCareer.seasons[0].tableSize, 20, "une ancienne sauvegarde à 6 clubs doit migrer vers 20 équipes");
assert.equal(migratedCareer.seasons[0].tableFinish, 16, "le rang d'une ancienne sauvegarde doit être recalibré proportionnellement");

const callUpState = { ...seasonState, stats: { technique: 82, physique: 80, vista: 84, mental: 82, aura: 75, vestiaire: 70 } };
const eligibleCareer = {
  ...seasonA,
  seasons: [{ ...summary, appearances: 30, averageRating: 8.1 }],
};
const firstCall = generateInternationalOffer(callUpState, eligibleCareer);
assert(firstCall, "une grande saison doit ouvrir la sélection nationale");
assert.notEqual(firstCall.role, "Espoir", "une sélection senior doit proposer un rôle senior");
const declined = declineInternationalOffer(callUpState, eligibleCareer);
assert.equal(declined.career.international?.status, "declined");
assert.equal(generateInternationalOffer(callUpState, declined.career), null, "la sélection ne doit pas rappeler immédiatement après un refus");
const recalledState = { ...callUpState, season: declined.career.international?.nextOfferSeason ?? callUpState.season + 2 };
const recalled = generateInternationalOffer(recalledState, declined.career);
assert(recalled && recalled.previousRefusals === 1, "un refus doit permettre une nouvelle convocation plus tard");
const selected = acceptInternationalOffer(recalledState, declined.career, recalled);
assert.equal(selected.career.international?.status, "active");
assert(selected.state.threads.has("international"));
const internationalSeason = simulateSeason({ ...recalledState, season: 8, age: 22 }, selected.career, createRng("international-season"));
assert((internationalSeason.international?.caps ?? 0) > 0, "une sélection acceptée doit produire de vraies sélections");
assert(internationalSeason.seasons.at(-1)?.international?.tournament, "une saison de tournoi international doit être enregistrée");

const offers = generateTransferOffers(seasonState, seasonA);
assert.equal(offers.length, 4, "le mercato doit proposer une prolongation et trois clubs");
assert.equal(offers.filter((offer) => offer.moveType !== "stay").length, 3);
assert.equal(new Set(offers.map((offer) => offer.clubId)).size, 4, "les clubs du mercato doivent être distincts");
const accepted = acceptClubOffer(seasonState, seasonA, offers[1]);
assert.equal(accepted.career.currentClubId, offers[1].clubId);
assert.equal(accepted.career.clubHistory.length, 2, "un transfert doit être ajouté au parcours");
assert.equal(accepted.career.clubHistory[0].toSeason, seasonState.season, "le passage précédent doit être clôturé");

const loanTarget = clubs.find((club) => club.id !== started.career.currentClubId)!;
const loaned = acceptClubOffer(seasonState, seasonA, {
  id: `loan:test:${loanTarget.id}`,
  clubId: loanTarget.id,
  moveType: "loan",
  role: "Titulaire",
  salaryM: 0.5,
  duration: 1,
  competition: 45,
  reason: "Test de prêt",
});
assert(loaned.career.loan, "un prêt doit mémoriser le club propriétaire");
const returned = returnFromLoanIfDue({ ...seasonState, season: seasonState.season + 1 }, loaned.career);
assert(returned.returned, "le joueur doit revenir automatiquement après son prêt");
assert.equal(returned.career.currentClubId, started.career.currentClubId);

console.log(`  ✓ football : ${leagues.length} championnats à 20 équipes, ${clubs.length} clubs majeurs, ${displayedFlagCodes.size} drapeaux SVG, saisons et mercato déterministes`);
