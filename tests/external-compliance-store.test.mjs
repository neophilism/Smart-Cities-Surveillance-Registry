import assert from "node:assert/strict";
import { test } from "node:test";
import { PostgresExternalComplianceRepository } from "../packages/smart-cities-compliance/src/store.ts";
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

test("failed insert rolls back and a later retry can commit", async () => {
  let fail = true;
  const calls = [];
  const client = { async query(sql) {
    calls.push(sql);
    if (sql.includes("SELECT 1 FROM civic_registry_records")) return { rows: [{}] };
    if (sql.includes("INSERT INTO smart_cities_external_claims") && fail) throw Error("temporary database error");
    return { rows: [], rowCount: 1 };
  }, release() {} };
  const repository = new PostgresExternalComplianceRepository({ connect: async () => client });
  await assert.rejects(repository.importClaims(scope, [claim]), /temporary database error/);
  assert.ok(calls.includes("ROLLBACK"));
  assert.ok(!calls.includes("COMMIT"));
  fail = false;
  const recovered = await repository.importClaims(scope, [claim]);
  assert.equal(recovered.inserted, 1);
  assert.ok(calls.includes("COMMIT"));
});
test("provider failure audit stores only coarse code and scoped IDs", async () => {
  const { calls, pool } = fakePool();
  const id = await new PostgresExternalComplianceRepository(pool).recordFailure(scope, "PROVIDER_ERROR");
  assert.ok(id);
  assert.match(calls[0].sql, /smart_cities_external_claim_imports/);
  assert.deepEqual(calls[0].values.slice(1), ["city", "r1", "official", "PROVIDER_ERROR"]);
});

test("direct storage rejects malformed provenance before opening a transaction", async () => {
  const { calls, pool } = fakePool();
  const repository = new PostgresExternalComplianceRepository(pool);
  await assert.rejects(repository.importClaims(scope, [{ ...claim, sourceUrl: "http://local.example" }]), /source URL/);
  await assert.rejects(repository.importClaims(scope, [{ ...claim, kind: "certified" }]), /claim kind/);
  assert.equal(calls.length, 0);
});

test("direct storage rejects conflicting duplicate source assertions", async () => {
  const { calls, pool } = fakePool();
  await assert.rejects(new PostgresExternalComplianceRepository(pool).importClaims(scope, [claim, { ...claim, assertion: "Contradiction" }]), /Conflicting duplicate claim/);
  assert.equal(calls.length, 0);
});
