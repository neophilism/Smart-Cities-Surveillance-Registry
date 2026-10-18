import assert from "node:assert/strict";
import { test } from "node:test";
import { retentionProjection } from "../packages/smart-cities-retention/src/index.ts";
const scope = { registryId:"city", recordId:"device-3" };
const claim = { ...scope, sourceUrl:"https://city.example.gov/policy/3", observedAt:"2026-10-18T12:00:00Z",
 policy:"Keep records 30 days", obligation:"Delete within 30 days", measuredFulfillment:"reported_complete", verification:"unverified" };
test("reported deletion never becomes independently verified deletion", () => {
 const view = retentionProjection(claim,scope);
 assert.equal(view.reportedFulfillment,"reported_complete");
 assert.equal(view.actualDeletionVerified,false);
 assert.equal(view.sourceUrl,claim.sourceUrl);
});
test("only explicit independent verification supports verified flag", () => {
 assert.equal(retentionProjection({...claim,verification:"independently_verified"},scope).actualDeletionVerified,true);
});
test("cross-registry, unsafe provenance and malformed states fail closed", () => {
 assert.throws(()=>retentionProjection({...claim,registryId:"other"},scope),/scope mismatch/);
 assert.throws(()=>retentionProjection({...claim,sourceUrl:"http://city.example.gov"},scope),/source URL/);
 assert.throws(()=>retentionProjection({...claim,measuredFulfillment:"deleted"},scope),/fulfillment/);
});
