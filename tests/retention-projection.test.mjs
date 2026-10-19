import assert from "node:assert/strict";
import { test } from "node:test";
import { retentionProjection, retentionHistory } from "../packages/smart-cities-retention/src/index.ts";
const scope = { registryId:"city", recordId:"device-3" };
const claim = { ...scope, sourceUrl:"https://city.example.gov/policy/3", observedAt:"2026-10-18T12:00:00Z",
 policy:"Keep records 30 days", obligation:"Delete within 30 days", measuredFulfillment:"reported_complete", verification:"unverified" };
test("reported deletion never becomes independently verified deletion", () => {
 const view = retentionProjection(claim,scope);
 assert.equal(view.reportedFulfillment,"reported_complete");
 assert.equal(view.actualDeletionVerified,false);
 assert.equal(view.sourceUrl,claim.sourceUrl);
});
test("even an external independent-verification label is insufficient proof", () => {
 assert.equal(retentionProjection({...claim,verification:"independently_verified"},scope).actualDeletionVerified,false);
});
test("cross-registry, unsafe provenance and malformed states fail closed", () => {
 assert.throws(()=>retentionProjection({...claim,registryId:"other"},scope),/scope mismatch/);
 assert.throws(()=>retentionProjection({...claim,sourceUrl:"http://city.example.gov"},scope),/source URL/);
 assert.throws(()=>retentionProjection({...claim,measuredFulfillment:"deleted"},scope),/fulfillment/);
});

test("bounded public history rejects duplicates and cross-record observations",()=>{
 const earlier={...claim,observedAt:"2026-10-17T12:00:00Z"};
 const rows=retentionHistory([earlier,claim],scope);
 assert.equal(rows[0].observedAt,claim.observedAt);
 assert.equal(rows[1].actualDeletionVerified,false);
 assert.throws(()=>retentionHistory([claim,claim],scope),/Duplicate/);
 assert.throws(()=>retentionHistory([{...claim,recordId:"other"}],scope),/scope mismatch/);
 assert.throws(()=>retentionHistory(Array(101).fill(claim),scope),/limit/);
});
test("rejects unsafe or internal evidence URLs and unrecognized claim fields",()=>{
 for (const sourceUrl of ["https://localhost/private","https://127.0.0.1/private","https://[::1]/private","https://city.example.gov/path#fragment"]) {
  assert.throws(()=>retentionProjection({...claim,sourceUrl},scope),/source URL/);
 }
 assert.throws(()=>retentionProjection({...claim,extra:"unreviewed"},scope),/schema/);
 assert.throws(()=>retentionProjection({...claim,policy:"line\\nsecret"},scope),/required/);
});
