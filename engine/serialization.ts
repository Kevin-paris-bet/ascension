import type { CareerState } from "./state";

export const CAREER_SAVE_VERSION = 1 as const;

export type SerializedCareerState = Omit<CareerState, "threads" | "unlockedEvents" | "played"> & {
  threads: string[];
  unlockedEvents: string[];
  played: string[];
};

export function serializeCareerState(state: CareerState): SerializedCareerState {
  return {
    ...state,
    threads: [...state.threads],
    unlockedEvents: [...state.unlockedEvents],
    played: [...state.played],
  };
}

export function deserializeCareerState(value: SerializedCareerState): CareerState {
  return {
    ...value,
    stats: { ...value.stats },
    threads: new Set(value.threads),
    threadLevels: { ...value.threadLevels },
    threadPosedAtAge: { ...value.threadPosedAtAge },
    unlockedEvents: new Set(value.unlockedEvents),
    locks: { ...value.locks },
    played: new Set(value.played),
    history: value.history.map((entry) => ({ ...entry })),
  };
}
