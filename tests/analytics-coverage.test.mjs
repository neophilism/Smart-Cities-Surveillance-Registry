import assert from "node:assert/strict";
import test from "node:test";
import { PostgresAnalyticsRepository } from "../packages/database/src/analytics.ts";

for (const [records, cited, uncited, percent] of [
  [0, 0, 0, 0], [3, 1, 2, 33.3], [2, 2, 0, 100],
]) {
  test(`coverage uses distinct record totals (${records}/${cited})`, async () => {
    const pool = { async query(sql, values) {
      assert.equal(values[0], "tenant-a");
      if (sql.includes("AS records")) return { rows: [{ records: String(records), published: "0" }] };
      if (sql.includes("COUNT(DISTINCT record.id)")) return { rows: [{ count: String(cited) }] };
      if (sql.includes("AS overdue")) return { rows: [{ open: "0", due_soon: "0", overdue: "0" }] };
      return { rows: [] };
    } };
    const result = await new PostgresAnalyticsRepository(pool).getRegistryAnalytics(
      "tenant-a", { scope: "public", publicStatusIds: ["published"] },
    );
    assert.deepEqual(result.totals, {
      records, published: 0, citedRecords: cited, uncitedRecords: uncited,
      evidenceCoveragePercent: percent,
    });
  });
}

test("query failures reject analytics instead of presenting false zero coverage", async () => {
  const failure = new Error("database unavailable");
  const repository = new PostgresAnalyticsRepository({ async query() { throw failure; } });
  await assert.rejects(repository.getRegistryAnalytics("tenant-a", { scope: "public" }), failure);
});
