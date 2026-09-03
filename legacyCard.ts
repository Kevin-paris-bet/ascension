import type { CareerState } from "@/engine/state";
import { createRng } from "@/engine/rng";
import type { LegacyResult } from "@/engine/legacy";
import card from "@/content/fr-football/card.json";

export type CareerIdentity = {
  name: string;
  number: number;
};

export type LegacyCardData = {
  name: string;
  number: number;
  nickname: string | null;
  position: string;
  origin: string;
  seasons: number;
  matches: number;
  goals: number;
  assists: number;
  caps: number;
  cleanSheets: number;
  honours: string[];
  note: number;
  tier: string;
  quote: string;
  seed: string;
};

/** Rendements offensifs par poste : [buts, passes] pour 100 matchs. */
const OUTPUT_BY_POSITION: Record<string, [number, number]> = {
  "poste:attaquant": [48, 22],
  "poste:milieu": [18, 34],
  "poste:defenseur": [6, 8],
  "poste:gardien": [0, 1],
};

function findThread(state: CareerState, prefix: string): string | null {
  for (const t of state.threads) {
    if (t.startsWith(prefix)) return t;
  }
  return null;
}

/**
 * Le moteur ne compte pas les matchs — ce serait du vocabulaire sportif dans
 * `/engine`, ce que la section 8 interdit. On les dérive ici, de façon
 * déterministe depuis la seed de la carrière, à partir de trois entrées :
 * le nombre de saisons professionnelles, le niveau atteint (note) et le
 * temps de jeu implicite (statut de rotation, blessures, exil).
 */
export function buildLegacyCard(
  state: CareerState,
  legacy: LegacyResult,
  identity: CareerIdentity
): LegacyCardData {
  const rng = createRng(`${state.seed}:card`);

  const turnedPro = state.threads.has("contrat_pro") || state.threads.has("contrat_pro:fragile");
  const proStartAge = turnedPro ? 20 : 22;
  const seasons = Math.max(0, state.age - proStartAge);

  // Temps de jeu moyen par saison, modulé par ce qui s'est passé dans la carrière.
  let matchesPerSeason = 26;
  if (state.threads.has("statut:rotation")) matchesPerSeason -= 8;
  if (state.threads.has("icone_club")) matchesPerSeason += 6;
  if (state.threads.has("carriere_menacee")) matchesPerSeason -= 6;
  if (state.threads.has("carriere_brisee")) matchesPerSeason -= 10;
  if (state.threads.has("confort")) matchesPerSeason += 2;
  matchesPerSeason = Math.max(8, matchesPerSeason);

  const matches = turnedPro
    ? Math.round(seasons * matchesPerSeason * (0.9 + rng.next() * 0.2))
    : Math.round(seasons * 14 * (0.8 + rng.next() * 0.3));

  const position = findThread(state, "poste:") ?? "poste:milieu";
  const [goalRate, assistRate] = OUTPUT_BY_POSITION[position] ?? [18, 30];

  // La note pilote le rendement : un joueur à 90 convertit mieux qu'un joueur à 65.
  const qualityFactor = 0.55 + (legacy.note / 100) * 0.9;
  const goals = Math.round((matches * goalRate * qualityFactor) / 100);
  let assists = Math.round((matches * assistRate * qualityFactor) / 100);

  // Un gardien ne marque pas et ne passe pas : sa statistique lisible est le
  // clean sheet. Taux réaliste : 25 % des matchs pour un gardien moyen,
  // jusqu'à ~40 % pour un très bon.
  const cleanSheets =
    position === "poste:gardien"
      ? Math.round(matches * (0.18 + (legacy.note / 100) * 0.24))
      : 0;
  if (position === "poste:gardien") assists = cleanSheets;

  let caps = 0;
  if (state.threads.has("international")) {
    caps = Math.round(seasons * (2.5 + rng.next() * 3.5) * (legacy.note / 80));
    if (state.threads.has("capitaine_selection")) caps = Math.round(caps * 1.25);
  } else if (state.threads.has("selection:formation")) {
    caps = rng.int(3, 12);
  }

  // Un palmarès qui liste tout ne distingue rien : on garde les trois lignes
  // les plus fortes, et on n'affiche les mentions mineures (priorité > 11)
  // que si la carrière n'a rien de plus marquant à montrer.
  const owned = card.honours.filter((h) => state.threads.has(h.thread)).sort((a, b) => a.priority - b.priority);
  const major = owned.filter((h) => h.priority <= 11);
  const honours = (major.length > 0 ? major : owned).slice(0, 3).map((h) => h.label);

  // Un ordre de priorité fixe ferait ressortir le même surnom pour la majorité
  // des cartes (les threads les plus communs gagnent toujours). On tire donc
  // parmi ceux que la carrière possède réellement — toujours via le PRNG à
  // seed, donc reproductible.
  const ownedNicknames = Object.entries(card.postureLabels).filter(([thread]) => state.threads.has(thread));
  const nicknameEntry =
    ownedNicknames.length > 0 ? ownedNicknames[rng.int(0, ownedNicknames.length - 1)] : undefined;

  const positionLabels = card.positionLabels as Record<string, string>;
  const originLabels = card.originLabels as Record<string, string>;
  const originThread = findThread(state, "origine:");

  return {
    name: identity.name.trim() || "SANS NOM",
    number: identity.number,
    nickname: nicknameEntry ? nicknameEntry[1] : null,
    position: positionLabels[position] ?? "Joueur",
    origin: originThread ? originLabels[originThread] ?? "" : "",
    seasons,
    matches,
    goals,
    assists,
    caps,
    cleanSheets,
    honours,
    note: legacy.note,
    tier: legacy.tier,
    quote: legacy.quote,
    seed: state.seed,
  };
}

export function getCardLabels() {
  return card.labels;
}
