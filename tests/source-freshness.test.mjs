import assert from "node:assert/strict";
import { test } from "node:test";
import { projectSourceFreshness } from "../packages/smart-cities-refresh/src/freshness.ts";
const base = { sourceId:"public-catalog", sourceUrl:"https://catalog.example.gov/dataset",
  observedAt:"2026-10-18T12:00:00Z", lastSuccessAt:"2026-10-18T11:00:00Z", staleAfterSeconds:3600 };
test("timestamped successful fetch is fresh only inside the declared threshold", () => {
  assert.equal(projectSourceFreshness(base).status,"fresh");
  assert.equal(projectSourceFreshness({...base,lastSuccessAt:"2026-10-18T10:59:59Z"}).status,"stale");
});
test("missing and future success cannot be reported as current", () => {
  assert.equal(projectSourceFreshness({...base,lastSuccessAt:null}).status,"unknown");
  assert.equal(projectSourceFreshness({...base,lastSuccessAt:"2026-10-19T00:00:00Z"}).status,"unknown");
});
test("invalid provenance and thresholds fail closed", () => {
  assert.throws(()=>projectSourceFreshness({...base,sourceUrl:"http://catalog.example.gov"}),/source URL/);
  assert.throws(()=>projectSourceFreshness({...base,staleAfterSeconds:0}),/threshold/);
});
