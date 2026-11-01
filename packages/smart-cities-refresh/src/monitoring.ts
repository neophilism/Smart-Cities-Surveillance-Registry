import type { SourceRefreshHealth, SourceRefreshRun } from "@civic-registry/database";
import { projectSourceFreshness, type FreshnessStatus } from "./freshness.ts";

export interface SourceMonitoringObservation {
  registryId: string;
  sourceId: string;
  observedAt: string;
  status: FreshnessStatus;
  sourceUrl: string | null;
  lastSuccessAt: string | null;
  ageSeconds: number | null;
  successfulRunId: string | null;
  outputSha256: string | null;
  missingSourceReferences: number;
  ingestionFailedItems: number | null;
}

function safeSourceUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && url.hostname.includes(".");
  } catch { return false; }
}

/** Read-only projection; scheduler state and site availability stay separate. */
export function projectSourceMonitoring(
  health: SourceRefreshHealth,
  run: SourceRefreshRun | undefined,
  observedAt: string,
): SourceMonitoringObservation {
  if (!Number.isFinite(Date.parse(observedAt))) throw new Error("Invalid observation time");
  const job = health.job;
  if (run && (run.registryId !== job.registryId || run.jobId !== job.id ||
      run.adapterId !== job.adapterId || run.profileId !== job.profileId)) {
    throw new Error("Source monitoring scope mismatch");
  }
  const successful = run && (run.status === "completed" || run.status === "completed_with_warnings")
    && run.completedAt && Number.isFinite(Date.parse(run.completedAt))
    && Date.parse(run.completedAt) <= Date.parse(observedAt) ? run : undefined;
  const pages = successful?.sourcePages ?? [];
  const validPages = pages.filter(safeSourceUrl);
  const sourceUrl = validPages[0] ?? null;
  const lastSuccessAt = successful?.completedAt ?? null;
  const freshness = sourceUrl ? projectSourceFreshness({
    sourceId: job.id, sourceUrl, observedAt, lastSuccessAt,
    staleAfterSeconds: job.staleAfterSeconds,
  }) : null;
  return {
    registryId: job.registryId, sourceId: job.id, observedAt,
    status: freshness?.status ?? "unknown", sourceUrl, lastSuccessAt,
    ageSeconds: freshness?.ageSeconds ?? null,
    successfulRunId: successful?.id ?? null,
    outputSha256: successful?.outputSha256 ?? null,
    missingSourceReferences: pages.length === 0 ? 1 : pages.length - validPages.length,
    ingestionFailedItems: successful?.ingestionFailedItems ?? null,
  };
}
