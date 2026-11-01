/**
 * Source observations are not evidence of site availability or of successful
 * ingestion. Freshness is unknown without a witnessed successful source run.
 */
export interface SourceFreshnessInput {
  sourceId: string;
  sourceUrl: string;
  observedAt: string;
  lastSuccessAt: string | null;
  staleAfterSeconds: number;
}
export type FreshnessStatus = "fresh" | "stale" | "unknown";
export interface SourceFreshness {
  sourceId: string;
  sourceUrl: string;
  observedAt: string;
  lastSuccessAt: string | null;
  status: FreshnessStatus;
  ageSeconds: number | null;
}
export function projectSourceFreshness(input: SourceFreshnessInput): SourceFreshness {
  let url: URL;
  try { url = new URL(input.sourceUrl); } catch { throw new Error("Invalid source URL"); }
  if (url.protocol !== "https:" || url.username || url.password || !url.hostname.includes(".")) {
    throw new Error("Invalid source URL");
  }
  const observed = Date.parse(input.observedAt);
  if (!Number.isFinite(observed)) throw new Error("Invalid observation time");
  if (!Number.isSafeInteger(input.staleAfterSeconds) || input.staleAfterSeconds < 1) {
    throw new Error("Invalid source staleness threshold");
  }
  let ageSeconds: number | null = null;
  let status: FreshnessStatus = "unknown";
  if (input.lastSuccessAt !== null) {
    const success = Date.parse(input.lastSuccessAt);
    if (!Number.isFinite(success)) throw new Error("Invalid success time");
    if (success <= observed) {
      ageSeconds = Math.floor((observed - success) / 1000);
      status = ageSeconds > input.staleAfterSeconds ? "stale" : "fresh";
    }
  }
  return {
    sourceId: input.sourceId, sourceUrl: input.sourceUrl,
    observedAt: input.observedAt, lastSuccessAt: input.lastSuccessAt,
    status, ageSeconds,
  };
}
