import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../packages/smart-cities-matching/src/index.ts", import.meta.url), "utf8");
test("matches exact identifiers with registry and record-type scope", () => {
  assert.match(source, /registry_id = \$1 AND record_type_id = \$2/);
  assert.match(source, /item->>'scheme' = \$3 AND item->>'value' = \$4/);
  assert.match(source, /LIMIT 2/);
});
test("submits proposals for review rather than creating published relationships", () => {
  assert.match(source, /PostgresRelationshipCandidateService/);
  assert.match(source, /this\.candidates\.propose\(/);
  assert.doesNotMatch(source, /INSERT INTO civic_registry_relationships/);
});
test("requires provenance and rejects self-links", () => {
  assert.match(source, /sourceUrl: input\.sourceUrl/);
  assert.match(source, /sourceField: input\.sourceField/);
  assert.match(source, /targetId === input\.fromRecordId/);
});
