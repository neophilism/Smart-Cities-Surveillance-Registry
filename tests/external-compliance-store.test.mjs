import assert from "node:assert/strict";
import { test } from "node:test";
import { PostgresExternalComplianceRepository } from "../packages/database/src/external-compliance.ts";
const scope = { registryId: "city", recordId: "r1", providerId: "official" };
const claim = { ...scope, sourceId: "s1", sourceUrl: "https://city.example.gov/audit/1", observedAt: "2026-10-18T12:00:00Z", kind: "audit", assertion: "Review opened" };
function fakePool(recordExists = true) {
  const calls = [];
  const client = { async query(sql, values) {
    calls.push({ sql, values });
    if (sql.includes("SELECT 1 FROM civic_registry_records")) return { rows: recordExists ? [{ "?column?": 1 }] : [] };
    if (sql.includes("INSERT INTO smart_cities_external_claims")) return { rowCount: 1, rows: [] };
    return { rows: [], rowCount: 1 };
  }, release() { calls.push({ sql: "RELEASE" }); } };
  return { calls, pool: { connect: async () => client, query: client.query.bind(client) } };
}
test("external claim store uses scoped record lock, immutable insert and audit transaction", async () => {
  const { calls, pool } = fakePool();
  const result = await new PostgresExternalComplianceRepository(pool).importClaims(scope, [claim]);
  assert.equal(result.received, 1); assert.equal(result.inserted, 1);
  assert.equal(calls[0].sql, "BEGIN");
  assert.deepEqual(calls[1].values, ["city", "r1"]);
  assert.ok(calls.some(call => call.sql.includes("ON CONFLICT DO NOTHING")));
  assert.ok(calls.some(call => call.sql === "COMMIT"));
});
test("cross-registry or missing record import fails without committing", async () => {
  const { calls, pool } = fakePool();
  await assert.rejects(new PostgresExternalComplianceRepository(pool).importClaims(scope, [{ ...claim, registryId: "other" }]), /Scope mismatch/);
  assert.equal(calls.length, 0);
  const missing = fakePool(false);
  await assert.rejects(new PostgresExternalComplianceRepository(missing.pool).importClaims(scope, [claim]), /Scoped record not found/);
  assert.ok(missing.calls.some(call => call.sql === "ROLLBACK"));
  assert.ok(!missing.calls.some(call => call.sql === "COMMIT"));
});
test("read projection is scoped to one registry and record", async () => {
  const { calls, pool } = fakePool();
  await new PostgresExternalComplianceRepository(pool).listForRecord("city", "r1");
  assert.deepEqual(calls[0].values, ["city", "r1"]);
  assert.match(calls[0].sql, /WHERE registry_id = \$1 AND record_id = \$2/);
});
