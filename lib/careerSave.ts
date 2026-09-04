import {
  CAREER_SAVE_VERSION,
  deserializeCareerState,
  serializeCareerState,
  type SerializedCareerState,
} from "@/engine/serialization";
import type { CareerState } from "@/engine/state";
import type { ClubOffer, FootballCareer, InternationalOffer, SeasonSummary } from "@/lib/footballCareer";

export type PersistedScreen = "club_choice" | "playing" | "outcome" | "season_summary" | "international_offer" | "transfer_market" | "retirement";
export type PendingStepKind = "event" | "retirement" | "over";

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
  football?: FootballCareer;
  initialClubOffers?: ClubOffer[];
  seasonSummary?: SeasonSummary;
  transferOffers?: ClubOffer[];
  internationalOffer?: InternationalOffer;
  pendingKind?: PendingStepKind;
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
