import {
  CAREER_SAVE_VERSION,
  deserializeCareerState,
  serializeCareerState,
  type SerializedCareerState,
} from "@/engine/serialization";
import type { CareerState } from "@/engine/state";

export type PersistedScreen = "playing" | "outcome" | "retirement";

export type CareerSave = {
  version: typeof CAREER_SAVE_VERSION;
  savedAt: string;
  screen: PersistedScreen;
  identity: { name: string; number: number };
  selection: Record<string, string>;
  state: SerializedCareerState;
  rngState: number;
  eventId: string | null;
  lastOutcome: string;
  lastSuccess?: boolean;
  lastDeltas: Record<string, number>;
};

export function createCareerSave(input: Omit<CareerSave, "version" | "savedAt" | "state"> & { state: CareerState }): CareerSave {
  return {
    ...input,
    version: CAREER_SAVE_VERSION,
    savedAt: new Date().toISOString(),
    state: serializeCareerState(input.state),
  };
}

export function parseCareerSave(value: unknown): CareerSave | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<CareerSave>;
  if (candidate.version !== CAREER_SAVE_VERSION || !candidate.state || !candidate.identity) return null;
  return candidate as CareerSave;
}

export function restoreCareerState(save: CareerSave): CareerState {
  return deserializeCareerState(save.state);
}
