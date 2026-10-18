import assert from "node:assert/strict";
import { test } from "node:test";
import { importExternalClaims } from "../packages/smart-cities-compliance/src/index.ts";
const scope = { registryId: "city", recordId: "r1", providerId: "official" };
const item = { ...scope, sourceId: "d1", sourceUrl: "https://gov.example.org/case/d1", observedAt: "2026-10-18T12:00:00Z", kind: "audit", assertion: "Review initiated" };
test("batch deduplicates provider retries but reports invalid cross-tenant rows", () => {
 const result = importExternalClaims([item,item,{...item,registryId:"foreign"}],scope);
 assert.equal(result.accepted.length,1);
 assert.deepEqual(result.rejected.map(row => row.index),[2]);
});
