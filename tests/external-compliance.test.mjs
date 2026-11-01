import assert from "node:assert/strict";
import { test } from "node:test";
import { validateExternalClaim } from "../packages/smart-cities-compliance/src/index.ts";
const scope = { registryId: "city", recordId: "record-1", providerId: "city-feed" };
const fact = { ...scope, sourceId: "official-1", sourceUrl: "https://city.example.gov/review/1", observedAt: "2026-10-18T10:00:00Z", kind: "accountability", assertion: "Review pending" };
test("external claim preserves scope and source without granting compliance", () => {
  const c = validateExternalClaim(fact, scope);
  assert.equal(c.sourceId, "official-1");
  assert.equal("compliant" in c, false);
});
test("cross-record, cross-registry, cross-provider data rejected", () => {
  for (const k of ["recordId","registryId","providerId"]) assert.throws(() => validateExternalClaim({...fact, [k]:"foreign"}, scope), /Scope mismatch/);
});
test("invalid URL, timestamp and kind rejected", () => {
  assert.throws(() => validateExternalClaim({...fact,sourceUrl:"http://city.example.gov"},scope), /source URL/);
  assert.throws(() => validateExternalClaim({...fact,sourceUrl:"https://user:password@city.example.gov"},scope), /source URL/);
  assert.throws(() => validateExternalClaim({...fact,observedAt:"unknown"},scope), /timestamp/);
  assert.throws(() => validateExternalClaim({...fact,kind:"certified"},scope), /claim kind/);
});
