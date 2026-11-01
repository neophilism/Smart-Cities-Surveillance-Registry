import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
test("transparency analytics distinguishes cited from uncited records without inference", () => {
 const s = readFileSync("packages/database/src/analytics.ts","utf8");
 assert.match(s,/uncitedRecords: Math.max\(0, records - citedRecords\)/);
 assert.match(s,/COUNT\(DISTINCT record.id\)/);
 assert.match(s,/citation.visibility = 'public'/);
 assert.match(s,/evidenceCoveragePercent:/);
});
