import type { LegacyCardData } from "@/lib/legacyCard";
import type { Json, Tables } from "@/types/database";

export type CareerResult = Omit<Tables<"career_results">, "summary"> & {
  summary: LegacyCardData;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** Les résumés viennent d'une colonne JSON : on les valide avant de les afficher. */
export function parseLegacySummary(value: Json): LegacyCardData | null {
  if (!isRecord(value)) return null;

  const requiredStrings = ["name", "position", "origin", "tier", "quote", "seed"] as const;
  const requiredNumbers = ["number", "seasons", "matches", "goals", "assists", "caps", "cleanSheets", "note"] as const;

  if (!requiredStrings.every((key) => typeof value[key] === "string")) return null;
  if (!requiredNumbers.every((key) => isFiniteNumber(value[key]))) return null;
  if (!(value.nickname === null || typeof value.nickname === "string")) return null;
  if (!Array.isArray(value.honours) || !value.honours.every((item) => typeof item === "string")) return null;
  if (value.clubs !== undefined && (!Array.isArray(value.clubs) || !value.clubs.every((item) => typeof item === "string"))) return null;
  if (value.championships !== undefined && (!Array.isArray(value.championships) || !value.championships.every((item) => typeof item === "string"))) return null;
  if (value.lastClub !== undefined && value.lastClub !== null && typeof value.lastClub !== "string") return null;

  return value as LegacyCardData;
}

export function parseCareerResult(row: Tables<"career_results">): CareerResult | null {
  const summary = parseLegacySummary(row.summary);
  return summary ? { ...row, summary } : null;
}
