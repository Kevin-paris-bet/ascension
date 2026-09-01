/**
 * État de carrière. Conforme à la section 9.1 des specs, adapté au vocabulaire
 * "thread" retenu depuis engine/schema.ts (remplace flags/milestones de la
 * première version du document — le système de threads est plus riche : il
 * couvre à la fois les flags simples, les compteurs cumulatifs et les
 * callbacks narratifs).
 */

export type HistoryEntry = {
  season: number;
  age: number;
  eventId: string;
  choiceId: string;
  /** Renseigné uniquement pour un choix à résolution probabiliste */
  resolvedSuccess?: boolean;
  /** Texte affiché au joueur pour cet écran — sert à la carte finale (citation) */
  outcomeText: string;
};

export type CareerState = {
  seed: string;
  age: number;
  season: number;

  /** Stats définies par le pack de contenu (config.json), valeurs libres */
  stats: Record<string, number>;

  /** Threads posés (présents), sans valeur numérique */
  threads: Set<string>;

  /** Threads cumulatifs (ex. corps_sacrifie), niveau courant */
  threadLevels: Record<string, number>;

  /** Âge auquel chaque thread a été posé pour la première fois — sert à seasonsSinceThread */
  threadPosedAtAge: Record<string, number>;

  /** Événements explicitement débloqués par un effet `unlocks`, indépendamment de `requires` */
  unlockedEvents: Set<string>;

  /** Événements verrouillés : eventId -> saisons restantes avant réouverture */
  locks: Record<string, number>;

  /** Événements déjà tirés (pour le `once`) */
  played: Set<string>;

  /** Organisation courante (club / franchise / écurie...) */
  org: string | null;
  orgTier: number | null;

  /** Plafond de progression courant (modifié par capDelta) */
  cap: number;

  history: HistoryEntry[];

  /** État du PRNG, pour sérialiser une partie en cours */
  rngState: number;
};

export type CreateStateOptions = {
  seed: string;
  initialAge: number;
  initialStats: Record<string, number>;
  baseCap: number;
  initialThreads?: string[];
  org?: string | null;
  orgTier?: number | null;
};

export function createInitialState(opts: CreateStateOptions): CareerState {
  const threads = new Set(opts.initialThreads ?? []);
  const threadPosedAtAge: Record<string, number> = {};
  for (const t of threads) threadPosedAtAge[t] = opts.initialAge;

  return {
    seed: opts.seed,
    age: opts.initialAge,
    season: 0,
    stats: { ...opts.initialStats },
    threads,
    threadLevels: {},
    threadPosedAtAge,
    unlockedEvents: new Set(),
    locks: {},
    played: new Set(),
    org: opts.org ?? null,
    orgTier: opts.orgTier ?? null,
    cap: opts.baseCap,
    history: [],
    rngState: 0,
  };
}

/* ---------- Accesseurs de lecture, utilisés par le resolver ---------- */

export function hasThread(state: CareerState, thread: string): boolean {
  return state.threads.has(thread);
}

export function threadLevel(state: CareerState, thread: string): number {
  return state.threadLevels[thread] ?? 0;
}

export function seasonsSinceThread(state: CareerState, thread: string): number | null {
  const posedAt = state.threadPosedAtAge[thread];
  if (posedAt === undefined) return null;
  return state.age - posedAt;
}

export function isLocked(state: CareerState, eventId: string): boolean {
  return (state.locks[eventId] ?? 0) > 0;
}

export function isUnlocked(state: CareerState, eventId: string): boolean {
  return state.unlockedEvents.has(eventId);
}

/** Fait avancer les compteurs temporels d'une saison : décrémente les locks. */
export function advanceSeason(state: CareerState): CareerState {
  const locks: Record<string, number> = {};
  for (const [eventId, remaining] of Object.entries(state.locks)) {
    const next = remaining - 1;
    if (next > 0) locks[eventId] = next;
  }
  return { ...state, locks, season: state.season + 1 };
}
