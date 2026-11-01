import assert from "node:assert/strict";
import test from "node:test";
import { projectSourceMonitoring } from "../packages/smart-cities-refresh/src/monitoring.ts";

const observedAt = "2026-11-01T12:00:00Z";
const health = { status: "failing", job: {
  id: "catalog", registryId: "city", adapterId: "official", profileId: "drafts",
  staleAfterSeconds: 3600, enabled: true,
} };
const run = { id: "success-1", registryId: "city", jobId: "catalog", adapterId: "official",
  profileId: "drafts", status: "completed", completedAt: "2026-11-01T10:00:00Z",
  sourcePages: ["https://city.example.gov/catalog"], outputSha256: "a".repeat(64),
  ingestionFailedItems: 0 };

test("recent failures cannot refresh the age of persisted successful source evidence", () => {
  const result = projectSourceMonitoring(health, run, observedAt);
  assert.equal(result.status, "stale");
  assert.equal(result.ageSeconds, 7200);
  assert.equal(result.successfulRunId, "success-1");
  assert.equal(result.outputSha256, run.outputSha256);
  assert.equal(result.sourceUrl, run.sourcePages[0]);
  assert.equal(result.observedAt, observedAt);
  assert.equal(health.status, "failing");
  assert.equal(projectSourceMonitoring(health, { ...run, completedAt: "2026-11-01T11:00:00Z" }, observedAt).status, "fresh");
});

test("never-run, unfinished, failed, future and missing-reference evidence remains unknown", () => {
  for (const candidate of [undefined, { ...run, status: "failed" }, { ...run, status: "running" },
    { ...run, completedAt: "2026-11-02T00:00:00Z" }, { ...run, completedAt: undefined },
    { ...run, sourcePages: [] }]) {
    const result = projectSourceMonitoring(health, candidate, observedAt);
    assert.equal(result.status, "unknown");
    assert.equal(result.sourceUrl, null);
    assert.equal(result.missingSourceReferences, 1);
  }
});

test("scope mismatches are rejected before returning private source provenance", () => {
  for (const field of ["registryId", "jobId", "adapterId", "profileId"]) {
    assert.throws(() => projectSourceMonitoring(health, { ...run, [field]: "other" }, observedAt), /scope mismatch/);
  }
});

test("unsafe source references never become links and missing provenance is counted", () => {
  const bad = ["http://city.example.gov/a", "https://secret@city.example.gov/a", "javascript:alert(1)", "invalid"];
  const result = projectSourceMonitoring(health, { ...run, sourcePages: [...bad, ...run.sourcePages] }, observedAt);
  assert.equal(result.sourceUrl, run.sourcePages[0]);
  assert.equal(result.missingSourceReferences, 4);
  assert.equal(projectSourceMonitoring(health, { ...run, sourcePages: bad }, observedAt).status, "unknown");
});

test("warning and disabled scheduler states do not manufacture source or ingestion success", () => {
  const result = projectSourceMonitoring({ ...health, status: "disabled", job: { ...health.job, enabled: false } },
    { ...run, status: "completed_with_warnings", ingestionFailedItems: 3 }, observedAt);
  assert.equal(result.status, "stale");
  assert.equal(result.ingestionFailedItems, 3);
  assert.throws(() => projectSourceMonitoring(health, run, "invalid"), /observation time/);
});
