import assert from "node:assert/strict";
import { test } from "node:test";
import { mapOfficialSourceReferences } from "../packages/smart-cities-matching/src/mapping.ts";
import { proposeRelationshipsForIngestedRow } from "../packages/smart-cities-matching/src/integration.ts";

const base = {
  registryId: "city-registry",
  fromRecordId: "contract-17",
  row: {
    externalId: "source-contract-17", sourceUrl: "https://records.example.gov/contract/17",
    values: { vendor_id: ["V-42", "V-42", "V-43"], notes: "Example Corp", quantity: 7 },
  },
  mappings: [{
    sourceField: "vendor_id", relationshipTypeId: "procurement-with",
    targetRecordTypeId: "vendor", targetIdentifierScheme: "official-vendor-id",
  }],
};
test("explicit external references are deduplicated with intact provenance", () => {
  const result = mapOfficialSourceReferences(base);
  assert.deepEqual(result.references.map((r) => r.targetExternalId), ["V-42", "V-43"]);
  assert.equal(result.references[0].sourceKey, "source-contract-17");
  assert.equal(result.references[0].sourceField, "vendor_id");
  assert.equal(result.references[0].sourceUrl, "https://records.example.gov/contract/17");
});
test("missing mappings, missing source identity and structured identifiers never create links", () => {
  assert.equal(mapOfficialSourceReferences({ ...base, mappings: [] }).references.length, 0);
  assert.equal(mapOfficialSourceReferences({ ...base, row: { ...base.row, externalId: "" } }).references.length, 0);
  const result = mapOfficialSourceReferences({ ...base, mappings: [{
    ...base.mappings[0], sourceField: "quantity",
  }] });
  assert.equal(result.references.length, 0);
  assert.equal(result.warnings.length, 1);
});
test("review-only integration calls resolver and retains uncertain outcomes", async () => {
  const seen = [];
  const resolver = { async resolve(reference) {
    seen.push(reference);
    return { reference, status: reference.targetExternalId === "V-42" ? "proposed" : "ambiguous" };
  } };
  const result = await proposeRelationshipsForIngestedRow(resolver, base);
  assert.equal(seen.length, 2);
  assert.equal(result.proposed, 1);
  assert.equal(result.ambiguous, 1);
  assert.equal(result.existing, 0);
});
