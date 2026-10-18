import assert from "node:assert/strict";
import { test } from "node:test";
import { spreadsheetSafe } from "../packages/api/src/export.ts";
test("CSV formula injection stays inert despite whitespace and control prefix", () => {
 for (const input of ["=1+1", " +SUM(1,2)", "\t@cmd", "\r-42", "\n=HYPERLINK(1)"]) {
  assert.equal(spreadsheetSafe(input), "'" + input);
 }
});
test("ordinary public data is not altered", () => {
 for (const value of ["Civic registry","2026-10-18","42"]) assert.equal(spreadsheetSafe(value), value);
});
