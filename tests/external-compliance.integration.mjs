import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parseRegistryConfig } from "../packages/config/src/index.ts";
import {
  createDatabasePool,
  PostgresRecordRepository, PostgresRegistryConfigRepository, runMigrations,
} from "../packages/database/src/index.ts";
import { PostgresExternalComplianceRepository } from "../packages/smart-cities-compliance/src/store.ts";
import { handleExternalClaimPush } from "../packages/smart-cities-compliance/src/push.ts";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required for external compliance integration tests");
const config = parseRegistryConfig(
  await readFile("examples/generic-registry/registry.yaml", "utf8"),
  { sourceName: "examples/generic-registry/registry.yaml" },
);
test("external assertions persist idempotently with scoped audit and tenant isolation", async () => {
  const pool = createDatabasePool({ connectionString: process.env.DATABASE_URL, applicationName: "external-compliance-test" });
  try {
    await runMigrations(pool);
    await pool.query("TRUNCATE civic_registry_configurations CASCADE");
    const configs = new PostgresRegistryConfigRepository(pool);
    await configs.upsert(config);
    const records = new PostgresRecordRepository(pool, configs);
    await records.create({
      id: "external-evidence-record", registryId: config.registry.id, recordTypeId: "organization",
      fields: { name: "Synthetic agency", website: "https://agency.example.gov" },
      status: "published", visibility: "public", tags: ["synthetic"], externalIdentifiers: [],
      createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", publishedAt: "2026-01-01T00:00:00Z",
    }, { bootstrapLifecycle: true });
    const scope = { registryId: config.registry.id, recordId: "external-evidence-record", providerId: "example-provider" };
    const claim = { ...scope, sourceId: "report-1", sourceUrl: "https://agency.example.gov/report", observedAt: "2026-10-18T12:00:00Z", kind: "audit", assertion: "Review pending" };
    const store = new PostgresExternalComplianceRepository(pool);
    const first = await store.importClaims(scope, [claim]);
    const second = await store.importClaims(scope, [claim]);
    assert.equal(first.inserted, 1); assert.equal(second.inserted, 0);
    assert.deepEqual((await store.listForRecord(scope.registryId, scope.recordId))[0], { ...claim, observedAt: "2026-10-18T12:00:00.000Z" });
    assert.deepEqual(await store.listForRecord("other-registry", scope.recordId), []);
    await assert.rejects(store.importClaims({ ...scope, recordId: "other-record" }, [{ ...claim, recordId: "other-record" }]), /Scoped record not found/);
    const token = "0123456789abcdef0123456789abcdef";
    const pushConfig = { token, registryId: scope.registryId, providerId: scope.providerId, store };
    const makeRequest = (claims, suppliedToken = token) => new Request("https://registry.example.gov/api/v1/integrations/compliance", {
      method: "POST", headers: { authorization: "Bearer " + suppliedToken, "content-type": "application/json" },
      body: JSON.stringify({ schemaVersion: 1, recordId: scope.recordId, claims }),
    });
    assert.equal((await handleExternalClaimPush(makeRequest([claim]), pushConfig)).status, 202);
    assert.equal((await handleExternalClaimPush(makeRequest([claim], "wrong"), pushConfig)).status, 401);
    assert.equal((await handleExternalClaimPush(makeRequest([{ ...claim, registryId: "foreign" }]), pushConfig)).status, 400);
    const audit = await pool.query(
      "SELECT status, received_count, inserted_count FROM smart_cities_external_claim_imports WHERE registry_id = $1 AND record_id = $2 ORDER BY created_at",
      [scope.registryId, scope.recordId],
    );
    assert.equal(audit.rows.length, 3);
    assert.deepEqual(audit.rows.map(row => row.inserted_count).sort(), [0, 0, 1]);
  } finally { await pool.end(); }
});
