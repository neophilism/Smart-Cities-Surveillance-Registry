import assert from "node:assert/strict";
import { test } from "node:test";
import { projectProviderRelationships } from "../packages/smart-cities-matching/src/provider-projection.ts";
const row = {
  id: "row-1", external_id: "contract-1",
  title: "Procurement example",
  canonical_url: "https://records.example.gov/contracts/1",
  source_adapter: "city-contracts", retrieved_at: "2026-01-01T00:00:00Z",
  vendor_external_id: "v-1", vendor_name: "Name never matched",
};
const mapping = {
  sourceField: "vendor_external_id", relationshipTypeId: "procurement-with",
  targetRecordTypeId: "vendor", targetIdentifierScheme: "official-vendor-id",
};
const record = { registryId: "city", recordId: "contract-record-1", sourceRow: row };
test("provider projections refuse mismatched adapters and absent approvals", async () => {
  const resolver = { resolve() { throw Error("must not resolve"); } };
  const mismatched = await projectProviderRelationships(resolver, { adapterId: "other", mappings: [mapping] }, record);
  assert.equal(mismatched.status, "skipped");
  const noMapping = await projectProviderRelationships(resolver, { adapterId: "city-contracts", mappings: [] }, record);
  assert.equal(noMapping.status, "skipped");
});
test("approved provider mappings only propose reviewable references", async () => {
  const proposed = [];
  const resolver = { async resolve(reference) {
    proposed.push(reference);
    return { reference, status: "proposed" };
  } };
  const result = await projectProviderRelationships(resolver, {
    adapterId: "city-contracts", mappings: [mapping],
  }, record);
  assert.equal(result.status, "processed");
  assert.equal(result.relationships.proposed, 1);
  assert.equal(proposed[0].targetExternalId, "v-1");
  assert.equal(proposed[0].sourceUrl, row.canonical_url);
  assert.equal(proposed[0].sourceField, "vendor_external_id");
});
