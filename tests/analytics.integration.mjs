import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  parseRegistryConfig,
} from "../packages/config/src/index.ts";
import {
  createDatabasePool,
  PostgresAnalyticsRepository,
  PostgresCitationRepository,
  PostgresDocumentRepository,
  PostgresRecordRepository,
  PostgresRegistryConfigRepository,
  PostgresSourceRepository,
  runMigrations,
} from "../packages/database/src/index.ts";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required for database integration tests.",
  );
}

const configSource = await readFile(
  "examples/generic-registry/registry.yaml",
  "utf8",
);
const config = parseRegistryConfig(configSource, {
  sourceName:
    "examples/generic-registry/registry.yaml",
});

test("public analytics aggregate the disclosure-safe field projection", async () => {
  const pool = createDatabasePool({
    connectionString: databaseUrl,
    applicationName:
      "civic-registry-analytics-integration-tests",
  });

  try {
    await runMigrations(pool);
    await pool.query(
      "TRUNCATE civic_registry_configurations CASCADE",
    );

    const configs =
      new PostgresRegistryConfigRepository(pool);
    const records = new PostgresRecordRepository(
      pool,
      configs,
    );
    const analytics =
      new PostgresAnalyticsRepository(pool);

    await configs.upsert(config);
    const sources = new PostgresSourceRepository(pool, configs);
    const documents = new PostgresDocumentRepository(pool, configs, sources);
    const citations = new PostgresCitationRepository(pool, configs, records, sources, documents);
    await sources.create({
      id: "analytics-source", registryId: config.registry.id,
      title: "Analytics evidence", sourceType: "document",
      visibility: "public", createdAt: "2026-10-01T12:00:00.000Z",
    });

    for (const [id, documentType] of [
      ["analytics-visible", "report"],
      ["analytics-redacted", "policy"],
    ]) {
      await records.create(
        {
          id,
          registryId: config.registry.id,
          recordTypeId: "document",
          fields: {
            title: id,
            document_type: documentType,
            published_on: "2026-10-01",
          },
          status: "published",
          visibility: "public",
          externalIdentifiers: [],
          tags: [],
          createdAt: "2026-10-01T12:00:00.000Z",
          updatedAt: "2026-10-01T12:00:00.000Z",
          publishedAt: "2026-10-01T12:00:00.000Z",
        },
        {
          bootstrapLifecycle: true,
        },
      );
    }

    await pool.query(
      `
        INSERT INTO civic_registry_field_disclosures (
          registry_id,
          record_id,
          field_id,
          disposition,
          updated_at
        )
        VALUES ($1, $2, $3, 'redacted', NOW())
      `,
      [
        config.registry.id,
        "analytics-redacted",
        "document_type",
      ],
    );

    for (const [id, recordId, fieldId, visibility] of [
      ["visible-evidence", "analytics-visible", "document_type", "public"],
      ["duplicate-evidence", "analytics-visible", "title", "public"],
      ["redacted-evidence", "analytics-redacted", "document_type", "public"],
      ["private-evidence", "analytics-redacted", "title", "private"],
    ]) {
      await citations.create({
        id, registryId: config.registry.id, recordId, fieldId, visibility,
        sourceId: "analytics-source", createdAt: "2026-10-01T12:00:00.000Z",
      });
    }

    const internal =
      await analytics.getRegistryAnalytics(
        config.registry.id,
        {
          scope: "internal",
          dimensionFieldId: "document_type",
          dimensionRecordTypeId: "document",
        },
      );
    const publicResult =
      await analytics.getRegistryAnalytics(
        config.registry.id,
        {
          scope: "public",
          publicStatusIds: ["published"],
          publicDeadlineTypeIds: ["review_due"],
          dimensionFieldId: "document_type",
          dimensionRecordTypeId: "document",
        },
      );

    assert.deepEqual(
      internal.dimension?.values,
      [
        { key: "policy", count: 1 },
        { key: "report", count: 1 },
      ],
    );
    assert.deepEqual(
      publicResult.dimension?.values,
      [{ key: "report", count: 1 }],
    );
    assert.equal(publicResult.totals.records, 2);
    assert.equal(internal.totals.citedRecords, 2);
    assert.equal(internal.totals.uncitedRecords, 0);
    assert.equal(publicResult.totals.citedRecords, 1);
    assert.equal(publicResult.totals.uncitedRecords, 1);
    assert.equal(publicResult.totals.evidenceCoveragePercent, 50);

    // Removing visible evidence must not reveal private or redacted evidence.
    await citations.delete(config.registry.id, "visible-evidence");
    await citations.delete(config.registry.id, "duplicate-evidence");
    const withoutVisibleEvidence = await analytics.getRegistryAnalytics(
      config.registry.id, { scope: "public", publicStatusIds: ["published"] },
    );
    assert.equal(withoutVisibleEvidence.totals.citedRecords, 0);
    assert.equal(withoutVisibleEvidence.totals.uncitedRecords, 2);
    // Record-level provenance remains eligible independent of field redaction.
    await citations.create({
      id: "record-evidence", registryId: config.registry.id,
      recordId: "analytics-redacted", sourceId: "analytics-source",
      visibility: "public", createdAt: "2026-10-01T12:00:00.000Z",
    });
    assert.equal((await analytics.getRegistryAnalytics(config.registry.id,
      { scope: "public", publicStatusIds: ["published"] })).totals.citedRecords, 1);
    const excluded = await analytics.getRegistryAnalytics(config.registry.id,
      { scope: "public", publicStatusIds: [] });
    assert.equal(excluded.totals.records, 0);
    assert.equal(excluded.totals.citedRecords, 0);
    assert.equal(excluded.totals.uncitedRecords, 0);
    const otherRegistry = await analytics.getRegistryAnalytics("another-registry",
      { scope: "public", publicStatusIds: ["published"] });
    assert.equal(otherRegistry.totals.records, 0);
    assert.deepEqual(otherRegistry.dimension, undefined);
  } finally {
    await pool.end();
  }
});
