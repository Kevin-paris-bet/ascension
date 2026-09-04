import { createRng, type Rng } from "@/engine/rng";
import type { CareerState } from "@/engine/state";
import worldData from "@/content/fr-football/world.json";
import { getNationalTeam, type NationalTeam } from "@/lib/nationalTeams";

export type SquadRole = "Espoir" | "Rotation" | "Titulaire" | "Cadre";
export type MoveType = "academy" | "stay" | "loan" | "transfer";

export type League = {
  id: string;
  name: string;
  country: string;
  flag: string;
  tier: number;
};

export type Club = {
  id: string;
  name: string;
  short: string;
  leagueId: string;
  strength: number;
  prestige: number;
  colors: [string, string];
};

export type PlayerContract = {
  clubId: string;
  startSeason: number;
  endSeason: number;
  salaryM: number;
  role: SquadRole;
  moveType: MoveType;
};

export type ClubSpell = {
  clubId: string;
  fromSeason: number;
  toSeason: number | null;
  moveType: MoveType;
};

export type CompetitionResult = {
  name: string;
  type: "domestic_cup" | "continental" | "international";
  stage: string;
  appearances: number;
  goals: number;
  assists: number;
  won: boolean;
};

export type InternationalSeason = {
  season: number;
  teamId: string;
  caps: number;
  goals: number;
  assists: number;
  role: SquadRole;
  tournament?: CompetitionResult;
};

export type InternationalCareer = {
  teamId: string;
  status: "eligible" | "declined" | "active" | "retired";
  refusals: number;
  nextOfferSeason: number;
  role: SquadRole;
  caps: number;
  goals: number;
  assists: number;
  captain: boolean;
  seasons: InternationalSeason[];
  trophies: string[];
};

export type InternationalOffer = {
  teamId: string;
  role: SquadRole;
  reason: string;
  previousRefusals: number;
};

export type LoanDetails = {
  parentClubId: string;
  parentLeagueId: string;
  parentContract: PlayerContract;
  returnSeason: number;
};

export type SeasonSummary = {
  season: number;
  age: number;
  clubId: string;
  leagueId: string;
  role: SquadRole;
  appearances: number;
  starts: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  averageRating: number;
  tableFinish: number;
  tableSize: number;
  objective: string;
  objectiveMet: boolean;
  trophies: string[];
  individualAwards: string[];
  domesticCup: CompetitionResult;
  continentalCup?: CompetitionResult;
  international?: InternationalSeason;
  divisionChange?: "promotion" | "relegation";
  salaryM: number;
  marketValueM: number;
};

export type FootballCareer = {
  currentClubId: string;
  currentLeagueId?: string;
  contract: PlayerContract;
  seasons: SeasonSummary[];
  clubHistory: ClubSpell[];
  international?: InternationalCareer;
  loan?: LoanDetails;
};

export type ClubOffer = {
  id: string;
  clubId: string;
  moveType: MoveType;
  role: SquadRole;
  salaryM: number;
  duration: number;
  competition: number;
  reason: string;
};

type RawLeague = League & { strengthBase: number; clubs: string[] };

const CLUB_PALETTES: Array<[string, string]> = [
  ["#173f8a", "#e4b83f"], ["#aa1f32", "#ffffff"], ["#0c6f52", "#f1d05c"],
  ["#191919", "#d43a37"], ["#1768a6", "#ffffff"], ["#63277f", "#e9c65b"],
  ["#cf6f1b", "#202020"], ["#142d63", "#d73142"], ["#087b87", "#f3f0df"],
  ["#7d152a", "#e7ae32"], ["#245139", "#ffffff"], ["#3d3d3d", "#cfb04d"],
];
const STRENGTH_DROPS = [0, 3, 7, 11, 16, 21];

function slugify(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function shortName(value: string): string {
  const words = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/\s+/).filter(Boolean);
  return (words.length > 1 ? words.map((word) => word[0]).join("") : words[0]?.slice(0, 3) ?? "FC").slice(0, 3).toUpperCase();
}

const rawLeagues = worldData.leagues as RawLeague[];
const world: { leagues: League[]; clubs: Club[] } = {
  leagues: rawLeagues.map((league) => ({ id: league.id, name: league.name, country: league.country, flag: league.flag, tier: league.tier })),
  clubs: rawLeagues.flatMap((league, leagueIndex) => league.clubs.map((name, clubIndex) => {
    const strength = Math.max(48, league.strengthBase - (STRENGTH_DROPS[clubIndex] ?? clubIndex * 4));
    return {
      id: slugify(name),
      name,
      short: shortName(name),
      leagueId: league.id,
      strength,
      prestige: Math.min(99, strength + (clubIndex < 2 ? 3 : 1)),
      colors: CLUB_PALETTES[(leagueIndex * 3 + clubIndex) % CLUB_PALETTES.length],
    } satisfies Club;
  })),
};
const leagueById = new Map(world.leagues.map((league) => [league.id, league]));
const clubById = new Map(world.clubs.map((club) => [club.id, club]));

export function getLeagues(): League[] {
  return world.leagues;
}

export function getClubs(): Club[] {
  return world.clubs;
}

export function getLeague(id: string): League {
  const league = leagueById.get(id);
  if (!league) throw new Error(`Championnat inconnu: ${id}`);
  return league;
}

export function getClub(id: string): Club {
  const club = clubById.get(id);
  if (!club) throw new Error(`Club inconnu: ${id}`);
  return club;
}

export function computeOverall(state: CareerState): number {
  const s = state.stats;
  const weighted = (s.technique ?? 0) + (s.physique ?? 0) + (s.vista ?? 0) + (s.mental ?? 0) + (s.aura ?? 0) * 0.5;
  return Math.max(1, Math.min(99, Math.round(weighted / 4.5)));
}

function shuffled<T>(items: T[], rng: Rng): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function roleForGap(playerOverall: number, clubStrength: number): SquadRole {
  const gap = playerOverall - clubStrength;
  if (gap >= 7) return "Cadre";
  if (gap >= -2) return "Titulaire";
  if (gap >= -9) return "Rotation";
  return "Espoir";
}

function seniorInternationalRole(playerOverall: number, teamStrength: number): SquadRole {
  const role = roleForGap(playerOverall, teamStrength);
  return role === "Espoir" ? "Rotation" : role;
}

function competitionFor(role: SquadRole): number {
  return { Cadre: 28, Titulaire: 45, Rotation: 68, Espoir: 84 }[role];
}

export function generateAcademyOffers(state: CareerState): ClubOffer[] {
  const rng = createRng(`${state.seed}:academy`);
  const candidates = world.clubs.filter((club) => club.strength <= 72 && club.strength >= 56);
  const picked = shuffled(candidates, rng).slice(0, 3);
  return picked.map((club, index) => ({
    id: `academy:${club.id}`,
    clubId: club.id,
    moveType: "academy",
    role: "Espoir",
    salaryM: Number((0.03 + club.prestige / 1500 + index * 0.01).toFixed(2)),
    duration: 4,
    competition: 58 + index * 8,
    reason: index === 0 ? "Un projet centré sur ta progression" : index === 1 ? "Un chemin rapide vers le groupe pro" : "Une formation exigeante et ambitieuse",
  }));
}

export function startFootballCareer(state: CareerState, offer: ClubOffer, nationalTeamId = "france"): { state: CareerState; career: FootballCareer } {
  const club = getClub(offer.clubId);
  const league = getLeague(club.leagueId);
  const contract: PlayerContract = {
    clubId: club.id,
    startSeason: state.season,
    endSeason: state.season + offer.duration,
    salaryM: offer.salaryM,
    role: offer.role,
    moveType: "academy",
  };
  return {
    state: { ...state, org: club.id, orgTier: league.tier },
    career: {
      currentClubId: club.id,
      currentLeagueId: club.leagueId,
      contract,
      seasons: [],
      clubHistory: [{ clubId: club.id, fromSeason: state.season + 1, toSeason: null, moveType: "academy" }],
      international: {
        teamId: nationalTeamId,
        status: "eligible",
        refusals: 0,
        nextOfferSeason: 3,
        role: "Espoir",
        caps: 0,
        goals: 0,
        assists: 0,
        captain: false,
        seasons: [],
        trophies: [],
      },
    },
  };
}

function positionRates(state: CareerState): [number, number] {
  if (state.threads.has("poste:attaquant")) return [0.43, 0.18];
  if (state.threads.has("poste:milieu")) return [0.16, 0.31];
  if (state.threads.has("poste:defenseur")) return [0.05, 0.08];
  return [0.01, 0.03];
}

function objectiveFor(club: Club, tableSize: number): { label: string; maxFinish: number } {
  if (club.strength >= 88) return { label: "Être champion", maxFinish: 1 };
  if (club.strength >= 80) return { label: "Jouer le titre", maxFinish: 2 };
  if (club.strength >= 72) return { label: "Finir dans le top 4", maxFinish: Math.min(4, tableSize) };
  if (club.strength >= 64) return { label: "Première moitié de tableau", maxFinish: Math.ceil(tableSize / 2) };
  return { label: "Assurer le maintien", maxFinish: Math.max(1, tableSize - 1) };
}

function competitionOutput(state: CareerState, appearances: number, rng: Rng): { goals: number; assists: number } {
  const [goalRate, assistRate] = positionRates(state);
  const quality = Math.max(0.55, computeOverall(state) / 78);
  return {
    goals: Math.max(0, Math.round(appearances * goalRate * quality * (0.72 + rng.next() * 0.55))),
    assists: Math.max(0, Math.round(appearances * assistRate * quality * (0.72 + rng.next() * 0.55))),
  };
}

function continentalCompetitionName(country: string): string {
  if (country === "Brésil" || country === "Argentine") return "Coupe d’Amérique des Clubs";
  if (country === "Arabie saoudite") return "Coupe d’Asie des Clubs";
  return "Coupe d’Europe des Clubs";
}

function simulateCup(state: CareerState, club: Club, league: League, rng: Rng, type: "domestic_cup" | "continental"): CompetitionResult {
  const strengthWeight = type === "continental" ? 0.7 : 0.62;
  const score = club.strength * strengthWeight + computeOverall(state) * (1 - strengthWeight) + rng.int(-13, 12);
  const thresholds = type === "continental" ? [86, 80, 73, 66] : [80, 73, 66, 59];
  const stages = ["Vainqueur", "Finale", "Demi-finale", "Quarts de finale", "Tours précédents"];
  const stageIndex = score >= thresholds[0] ? 0 : score >= thresholds[1] ? 1 : score >= thresholds[2] ? 2 : score >= thresholds[3] ? 3 : 4;
  const appearances = [7, 7, 6, 5, rng.int(1, 3)][stageIndex];
  const output = competitionOutput(state, appearances, rng);
  return {
    name: type === "domestic_cup" ? `Coupe de ${league.country}` : continentalCompetitionName(league.country),
    type,
    stage: stages[stageIndex],
    appearances,
    ...output,
    won: stageIndex === 0,
  };
}

function internationalTournamentName(team: NationalTeam, season: number): string | null {
  if (season < 4 || season % 4 !== 0) return null;
  if (season % 8 === 0) return "Championnat du Monde";
  return {
    Europe: "Championnat d’Europe",
    Afrique: "Coupe d’Afrique",
    "Amériques": "Coupe des Amériques",
    Asie: "Coupe d’Asie",
  }[team.confederation];
}

function simulateInternationalSeason(state: CareerState, international: InternationalCareer, rng: Rng): { career: InternationalCareer; summary?: InternationalSeason } {
  if (international.status !== "active") return { career: international };
  const team = getNationalTeam(international.teamId);
  const role = seniorInternationalRole(computeOverall(state) + 7, team.strength);
  const caps = Math.max(1, { Cadre: 9, Titulaire: 8, Rotation: 5, Espoir: 3 }[role] + rng.int(-1, 1));
  const output = competitionOutput(state, caps, rng);
  const tournamentName = internationalTournamentName(team, state.season);
  let tournament: CompetitionResult | undefined;
  if (tournamentName) {
    const tournamentScore = team.strength * 0.7 + computeOverall(state) * 0.3 + rng.int(-15, 12);
    const stages = tournamentScore >= 89 ? ["Vainqueur", 7] : tournamentScore >= 82 ? ["Finale", 7] : tournamentScore >= 75 ? ["Demi-finale", 6] : tournamentScore >= 68 ? ["Quarts de finale", 5] : ["Phase de groupes", 3];
    const tournamentOutput = competitionOutput(state, stages[1] as number, rng);
    tournament = {
      name: tournamentName,
      type: "international",
      stage: stages[0] as string,
      appearances: stages[1] as number,
      ...tournamentOutput,
      won: stages[0] === "Vainqueur",
    };
  }
  const summary: InternationalSeason = {
    season: state.season,
    teamId: team.id,
    caps: caps + (tournament?.appearances ?? 0),
    goals: output.goals + (tournament?.goals ?? 0),
    assists: output.assists + (tournament?.assists ?? 0),
    role,
    tournament,
  };
  const captain = international.captain || (role === "Cadre" && international.caps + summary.caps >= 35);
  const trophies = tournament?.won ? [...international.trophies, tournament.name] : international.trophies;
  return {
    summary,
    career: {
      ...international,
      role,
      caps: international.caps + summary.caps,
      goals: international.goals + summary.goals,
      assists: international.assists + summary.assists,
      captain,
      seasons: [...international.seasons, summary],
      trophies,
    },
  };
}

export function simulateSeason(state: CareerState, career: FootballCareer, rng: Rng): FootballCareer {
  const club = getClub(career.currentClubId);
  const activeLeagueId = career.currentLeagueId ?? club.leagueId;
  const activeLeague = getLeague(activeLeagueId);
  const leagueClubs = world.clubs.filter((item) => item.leagueId === activeLeagueId);
  const tableClubs = leagueClubs.some((item) => item.id === club.id) ? leagueClubs : [...leagueClubs.slice(0, -1), club];
  const overall = computeOverall(state);
  const role = career.contract.role;
  const roleStarts = { Cadre: 31, Titulaire: 26, Rotation: 14, Espoir: 6 }[role];
  const injuryPenalty = state.threads.has("carriere_brisee") ? 12 : state.threads.has("carriere_menacee") ? 7 : 0;
  const starts = Math.max(0, Math.min(34, roleStarts + rng.int(-4, 5) - injuryPenalty));
  const appearances = Math.max(starts, Math.min(38, starts + rng.int(3, 10)));
  const [goalRate, assistRate] = positionRates(state);
  const outputFactor = Math.max(0.42, 0.72 + (overall - club.strength) / 75 + (state.stats.mental ?? 50) / 260);
  const goals = Math.max(0, Math.round(appearances * goalRate * outputFactor * (0.82 + rng.next() * 0.35)));
  const assists = Math.max(0, Math.round(appearances * assistRate * outputFactor * (0.82 + rng.next() * 0.35)));
  const cleanSheets = state.threads.has("poste:gardien") ? Math.max(0, Math.round(appearances * (0.2 + overall / 500) * (0.8 + rng.next() * 0.3))) : 0;
  const averageRating = Number(Math.max(5.2, Math.min(9.4, 6.1 + (overall - 55) / 36 + (rng.next() - 0.5) * 0.8)).toFixed(1));

  const sortedStrength = [...tableClubs].sort((a, b) => b.strength - a.strength);
  const expected = Math.max(1, sortedStrength.findIndex((item) => item.id === club.id) + 1);
  const playerLift = Math.round((overall - club.strength) / 9);
  const tableFinish = Math.max(1, Math.min(tableClubs.length, expected - playerLift + rng.int(-1, 1)));
  const objective = objectiveFor(club, tableClubs.length);
  const domesticCup = simulateCup(state, club, activeLeague, rng, "domestic_cup");
  const previousSeason = career.seasons.at(-1);
  const qualifiedForContinent = activeLeague.tier === 1 && (previousSeason
    ? previousSeason.leagueId === activeLeagueId && previousSeason.tableFinish <= 2
    : club.prestige >= 88);
  const continentalCup = qualifiedForContinent ? simulateCup(state, club, activeLeague, rng, "continental") : undefined;
  const trophies = tableFinish === 1 ? [`Champion · ${activeLeague.name}`] : [];
  if (domesticCup.won) trophies.push(domesticCup.name);
  if (continentalCup?.won) trophies.push(continentalCup.name);
  const individualAwards: string[] = [];
  if (averageRating >= 8.25 && appearances >= 24) individualAwards.push("Joueur de la saison");
  if (state.threads.has("poste:attaquant") && goals >= 20) individualAwards.push("Soulier d’Or");
  if (state.threads.has("poste:milieu") && assists >= 13) individualAwards.push("Maestro de la saison");
  if (state.threads.has("poste:gardien") && cleanSheets >= 13) individualAwards.push("Gant d’Or");
  if (state.age <= 21 && averageRating >= 7.7) individualAwards.push("Révélation de l’année");
  if (averageRating >= 8.7 && (trophies.length > 0 || continentalCup?.stage === "Finale")) individualAwards.push("Golden Player");

  let nextLeagueId = activeLeagueId;
  let divisionChange: SeasonSummary["divisionChange"];
  if (activeLeague.tier === 2 && tableFinish === 1) {
    const promotedLeague = world.leagues.find((league) => league.country === activeLeague.country && league.tier === 1);
    if (promotedLeague) { nextLeagueId = promotedLeague.id; divisionChange = "promotion"; trophies.push(`Promotion en ${promotedLeague.name}`); }
  } else if (activeLeague.tier === 1 && tableFinish === tableClubs.length) {
    const relegatedLeague = world.leagues.find((league) => league.country === activeLeague.country && league.tier === 2);
    if (relegatedLeague) { nextLeagueId = relegatedLeague.id; divisionChange = "relegation"; }
  }

  const internationalResult = career.international ? simulateInternationalSeason(state, career.international, rng) : undefined;
  if (internationalResult?.summary?.tournament?.won) trophies.push(internationalResult.summary.tournament.name);

  const previousValue = career.seasons.at(-1)?.marketValueM ?? Math.max(0.1, (overall - 45) * 0.35);
  const performanceDelta = (averageRating - 6.5) * 2.4 + appearances / 24 + goals / 16 + assists / 20;
  const ageFactor = state.age <= 25 ? 1.12 : state.age >= 32 ? 0.82 : 1;
  const marketValueM = Number(Math.max(0.1, Math.min(180, (previousValue + performanceDelta) * ageFactor)).toFixed(1));

  const season: SeasonSummary = {
    season: state.season,
    age: Math.max(14, state.age - 1),
    clubId: club.id,
    leagueId: activeLeagueId,
    role,
    appearances,
    starts,
    goals,
    assists,
    cleanSheets,
    averageRating,
    tableFinish,
    tableSize: leagueClubs.length,
    objective: objective.label,
    objectiveMet: tableFinish <= objective.maxFinish,
    trophies,
    individualAwards,
    domesticCup,
    continentalCup,
    international: internationalResult?.summary,
    divisionChange,
    salaryM: career.contract.salaryM,
    marketValueM,
  };
  return {
    ...career,
    currentLeagueId: nextLeagueId,
    seasons: [...career.seasons, season],
    international: internationalResult?.career ?? career.international,
  };
}

export function shouldOpenTransferWindow(state: CareerState, career: FootballCareer): boolean {
  const last = career.seasons.at(-1);
  if (!last || state.age < 17) return false;
  const contractExpiring = career.contract.endSeason <= state.season + 1;
  const breakout = last.averageRating >= 7.8 && last.appearances >= 18;
  return contractExpiring || breakout || state.season % 2 === 0;
}

export function normalizeFootballCareer(career: FootballCareer, nationalTeamId: string): FootballCareer {
  const seasons = career.seasons.map((season) => ({
    ...season,
    cleanSheets: season.cleanSheets ?? 0,
    individualAwards: season.individualAwards ?? [],
    domesticCup: season.domesticCup ?? {
      name: `Coupe de ${getLeague(season.leagueId).country}`,
      type: "domestic_cup" as const,
      stage: "Non disputée",
      appearances: 0,
      goals: 0,
      assists: 0,
      won: false,
    },
  }));
  return {
    ...career,
    seasons,
    currentLeagueId: career.currentLeagueId ?? getClub(career.currentClubId).leagueId,
    international: career.international ?? {
      teamId: nationalTeamId,
      status: "eligible",
      refusals: 0,
      nextOfferSeason: Math.max(3, (career.seasons.at(-1)?.season ?? 0) + 1),
      role: "Espoir",
      caps: 0,
      goals: 0,
      assists: 0,
      captain: false,
      seasons: [],
      trophies: [],
    },
  };
}

export function generateInternationalOffer(state: CareerState, career: FootballCareer): InternationalOffer | null {
  const international = career.international;
  const last = career.seasons.at(-1);
  if (!international || !last || international.status === "active" || international.status === "retired") return null;
  if (state.age < 18 || state.season < international.nextOfferSeason) return null;
  const youthRefusalAge = state.threadPosedAtAge.regret_selection;
  if (youthRefusalAge !== undefined && state.age - youthRefusalAge < 3) return null;
  const team = getNationalTeam(international.teamId);
  const requiredOverall = Math.max(62, team.strength - 20);
  const qualified = computeOverall(state) >= requiredOverall && last.appearances >= 12 && last.averageRating >= 6.7;
  if (!qualified) return null;
  const role = seniorInternationalRole(computeOverall(state) + 7, team.strength);
  return {
    teamId: team.id,
    role,
    previousRefusals: international.refusals,
    reason: international.refusals > 0
      ? "Le sélectionneur revient vers toi : ta porte n’était pas fermée."
      : last.individualAwards.length > 0
        ? `Tes performances et ton titre de ${last.individualAwards[0]} ont convaincu le sélectionneur.`
        : `Ta saison à ${last.averageRating} de moyenne a convaincu le sélectionneur.`,
  };
}

function addStateThread(state: CareerState, thread: string): CareerState {
  const threads = new Set(state.threads);
  threads.add(thread);
  return {
    ...state,
    threads,
    threadPosedAtAge: state.threadPosedAtAge[thread] === undefined
      ? { ...state.threadPosedAtAge, [thread]: state.age }
      : state.threadPosedAtAge,
  };
}

export function acceptInternationalOffer(state: CareerState, career: FootballCareer, offer: InternationalOffer): { state: CareerState; career: FootballCareer } {
  if (!career.international) return { state, career };
  const withInternational = addStateThread(addStateThread(state, "selection:formation"), "international");
  return {
    state: withInternational,
    career: {
      ...career,
      international: { ...career.international, status: "active", role: offer.role },
    },
  };
}

export function declineInternationalOffer(state: CareerState, career: FootballCareer): { state: CareerState; career: FootballCareer } {
  if (!career.international) return { state, career };
  const refusals = career.international.refusals + 1;
  return {
    state: addStateThread(state, "selection_refusee"),
    career: {
      ...career,
      international: {
        ...career.international,
        status: "declined",
        refusals,
        nextOfferSeason: state.season + Math.min(4, 1 + refusals),
      },
    },
  };
}

export function returnFromLoanIfDue(state: CareerState, career: FootballCareer): { state: CareerState; career: FootballCareer; returned: boolean } {
  if (!career.loan || state.season < career.loan.returnSeason) return { state, career, returned: false };
  const loan = career.loan;
  const history = career.clubHistory.map((spell, index) => index === career.clubHistory.length - 1 ? { ...spell, toSeason: state.season } : spell);
  history.push({ clubId: loan.parentClubId, fromSeason: state.season + 1, toSeason: null, moveType: "stay" });
  const parentLeague = getLeague(loan.parentLeagueId);
  return {
    returned: true,
    state: { ...state, org: loan.parentClubId, orgTier: parentLeague.tier },
    career: {
      ...career,
      currentClubId: loan.parentClubId,
      currentLeagueId: loan.parentLeagueId,
      contract: { ...loan.parentContract, startSeason: state.season, endSeason: Math.max(state.season + 1, loan.parentContract.endSeason) },
      clubHistory: history,
      loan: undefined,
    },
  };
}

function salaryFor(club: Club, role: SquadRole, value: number): number {
  const roleFactor = { Cadre: 1.32, Titulaire: 1, Rotation: 0.72, Espoir: 0.42 }[role];
  return Number(Math.max(0.08, (club.prestige / 65 + value / 30) * roleFactor).toFixed(2));
}

export function generateTransferOffers(state: CareerState, career: FootballCareer): ClubOffer[] {
  const rng = createRng(`${state.seed}:market:${state.season}:${career.currentClubId}`);
  const current = getClub(career.currentClubId);
  const overall = computeOverall(state);
  const value = career.seasons.at(-1)?.marketValueM ?? 0.5;
  const external = world.clubs.filter((club) => {
    if (club.id === current.id) return false;
    const reach = 9 + Math.max(0, (state.stats.aura ?? 20) - 45) / 6;
    return club.strength <= overall + reach && club.strength >= Math.max(54, overall - 14);
  });
  const distinctLeagues: Club[] = [];
  for (const club of shuffled(external, rng).sort((a, b) => Math.abs(a.strength - overall) - Math.abs(b.strength - overall))) {
    if (distinctLeagues.length >= 3) break;
    if (distinctLeagues.some((item) => item.leagueId === club.leagueId) && external.length > 6) continue;
    distinctLeagues.push(club);
  }
  if (distinctLeagues.length < 3) {
    for (const club of shuffled(external, rng)) if (!distinctLeagues.includes(club) && distinctLeagues.length < 3) distinctLeagues.push(club);
  }
  if (distinctLeagues.length < 3) {
    const nearest = world.clubs
      .filter((club) => club.id !== current.id && !distinctLeagues.includes(club))
      .sort((a, b) => Math.abs(a.strength - overall) - Math.abs(b.strength - overall));
    for (const club of nearest) if (distinctLeagues.length < 3) distinctLeagues.push(club);
  }

  const stayRole = roleForGap(overall + 4, current.strength);
  const stay: ClubOffer = {
    id: `stay:${state.season}:${current.id}`,
    clubId: current.id,
    moveType: "stay",
    role: stayRole,
    salaryM: salaryFor(current, stayRole, value),
    duration: rng.int(2, 4),
    competition: competitionFor(stayRole),
    reason: "La continuité, avec un rôle revalorisé",
  };
  return [stay, ...distinctLeagues.map((club, index) => {
    const role = roleForGap(overall + (index === 0 ? 2 : 0), club.strength);
    const moveType: MoveType = role === "Espoir" && state.age < 25 ? "loan" : "transfer";
    return {
      id: `${moveType}:${state.season}:${club.id}`,
      clubId: club.id,
      moveType,
      role,
      salaryM: salaryFor(club, role, value),
      duration: moveType === "loan" ? 1 : rng.int(2, 5),
      competition: competitionFor(role),
      reason: moveType === "loan" ? "Du temps de jeu pour franchir un cap" : club.strength > current.strength ? "Un palier supérieur, mais plus de concurrence" : "Un rôle plus important dès maintenant",
    } satisfies ClubOffer;
  })];
}

export function acceptClubOffer(state: CareerState, career: FootballCareer, offer: ClubOffer): { state: CareerState; career: FootballCareer } {
  const club = getClub(offer.clubId);
  const league = getLeague(club.leagueId);
  const contract: PlayerContract = {
    clubId: club.id,
    startSeason: state.season,
    endSeason: state.season + offer.duration,
    salaryM: offer.salaryM,
    role: offer.role,
    moveType: offer.moveType,
  };
  if (offer.clubId === career.currentClubId) return { state, career: { ...career, contract, currentLeagueId: career.currentLeagueId ?? club.leagueId } };

  const history = career.clubHistory.map((spell, index) => index === career.clubHistory.length - 1 ? { ...spell, toSeason: state.season } : spell);
  history.push({ clubId: club.id, fromSeason: state.season + 1, toSeason: null, moveType: offer.moveType });
  const loan = offer.moveType === "loan" ? {
    parentClubId: career.currentClubId,
    parentLeagueId: career.currentLeagueId ?? getClub(career.currentClubId).leagueId,
    parentContract: career.contract,
    returnSeason: state.season + 1,
  } : undefined;
  return {
    state: { ...state, org: club.id, orgTier: league.tier },
    career: { ...career, currentClubId: club.id, currentLeagueId: club.leagueId, contract, clubHistory: history, loan },
  };
}
