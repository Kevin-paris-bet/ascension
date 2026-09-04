import { createRng, type Rng } from "@/engine/rng";
import type { CareerState } from "@/engine/state";
import worldData from "@/content/fr-football/world.json";

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
  averageRating: number;
  tableFinish: number;
  tableSize: number;
  objective: string;
  objectiveMet: boolean;
  trophies: string[];
  salaryM: number;
  marketValueM: number;
};

export type FootballCareer = {
  currentClubId: string;
  contract: PlayerContract;
  seasons: SeasonSummary[];
  clubHistory: ClubSpell[];
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

const world = worldData as { leagues: League[]; clubs: Club[] };
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

export function startFootballCareer(state: CareerState, offer: ClubOffer): { state: CareerState; career: FootballCareer } {
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
      contract,
      seasons: [],
      clubHistory: [{ clubId: club.id, fromSeason: state.season + 1, toSeason: null, moveType: "academy" }],
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

export function simulateSeason(state: CareerState, career: FootballCareer, rng: Rng): FootballCareer {
  const club = getClub(career.currentClubId);
  const leagueClubs = world.clubs.filter((item) => item.leagueId === club.leagueId);
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
  const averageRating = Number(Math.max(5.2, Math.min(9.4, 6.1 + (overall - 55) / 36 + (rng.next() - 0.5) * 0.8)).toFixed(1));

  const sortedStrength = [...leagueClubs].sort((a, b) => b.strength - a.strength);
  const expected = Math.max(1, sortedStrength.findIndex((item) => item.id === club.id) + 1);
  const playerLift = Math.round((overall - club.strength) / 9);
  const tableFinish = Math.max(1, Math.min(leagueClubs.length, expected - playerLift + rng.int(-1, 1)));
  const objective = objectiveFor(club, leagueClubs.length);
  const trophies = tableFinish === 1 ? [`Champion · ${getLeague(club.leagueId).name}`] : [];
  if (averageRating >= 8.7 && appearances >= 24) trophies.push("Joueur de la saison");

  const previousValue = career.seasons.at(-1)?.marketValueM ?? Math.max(0.1, (overall - 45) * 0.35);
  const performanceDelta = (averageRating - 6.5) * 2.4 + appearances / 24 + goals / 16 + assists / 20;
  const ageFactor = state.age <= 25 ? 1.12 : state.age >= 32 ? 0.82 : 1;
  const marketValueM = Number(Math.max(0.1, Math.min(180, (previousValue + performanceDelta) * ageFactor)).toFixed(1));

  const season: SeasonSummary = {
    season: state.season,
    age: Math.max(14, state.age - 1),
    clubId: club.id,
    leagueId: club.leagueId,
    role,
    appearances,
    starts,
    goals,
    assists,
    averageRating,
    tableFinish,
    tableSize: leagueClubs.length,
    objective: objective.label,
    objectiveMet: tableFinish <= objective.maxFinish,
    trophies,
    salaryM: career.contract.salaryM,
    marketValueM,
  };
  return { ...career, seasons: [...career.seasons, season] };
}

export function shouldOpenTransferWindow(state: CareerState, career: FootballCareer): boolean {
  const last = career.seasons.at(-1);
  if (!last || state.age < 17) return false;
  const contractExpiring = career.contract.endSeason <= state.season + 1;
  const breakout = last.averageRating >= 7.8 && last.appearances >= 18;
  return contractExpiring || breakout || state.season % 2 === 0;
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
  if (offer.clubId === career.currentClubId) return { state, career: { ...career, contract } };

  const history = career.clubHistory.map((spell, index) => index === career.clubHistory.length - 1 ? { ...spell, toSeason: state.season } : spell);
  history.push({ clubId: club.id, fromSeason: state.season + 1, toSeason: null, moveType: offer.moveType });
  return {
    state: { ...state, org: club.id, orgTier: league.tier },
    career: { ...career, currentClubId: club.id, contract, clubHistory: history },
  };
}
