import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  compileRegistryConfig,
  parseRegistryConfig,
} from "../packages/config/src/index.ts";
import {
  createDatabasePool,
  PostgresIngestionService,
  PostgresRecordHistoryRepository,
  PostgresRecordRepository,
  PostgresRegistryConfigRepository,
  runMigrations,
} from "../packages/database/src/index.ts";
import {
  parseIngestionProfile,
} from "../packages/ingestion/src/index.ts";

const databaseUrl =
  process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required for Smart Cities ingestion integration tests.",
  );
}

const config = parseRegistryConfig(
  await readFile(
    "config/registry.yaml",
    "utf8",
  ),
  {
    sourceName: "config/registry.yaml",
  },
);
const compiled =
  compileRegistryConfig(config);

async function setup() {
  const pool = createDatabasePool({
    connectionString: databaseUrl,
    applicationName:
      "smart-cities-structured-ingestion-tests",
  });

  await runMigrations(pool);
  await pool.query(
    "TRUNCATE civic_registry_configurations CASCADE",
  );

  const configs =
    new PostgresRegistryConfigRepository(
      pool,
    );
  await configs.upsert(config);

  return {
    pool,
    service:
      new PostgresIngestionService(pool),
    records:
      new PostgresRecordRepository(
        pool,
        configs,
      ),
    history:
      new PostgresRecordHistoryRepository(
        pool,
      ),
  };
}

const cases = [
  {
    name: "deployment CSV",
    profile:
      "examples/smart-cities-ingestion/deployments.yaml",
    input:
      "examples/smart-cities-ingestion/deployments.csv",
    format: "csv",
    recordId: "import-deployment-1",
    fieldId: "name",
    fieldValue:
      "Example Civic Center Camera Program",
  },
  {
    name: "policy JSON",
    profile:
      "examples/smart-cities-ingestion/policies.yaml",
    input:
      "examples/smart-cities-ingestion/policies.json",
    format: "json",
    recordId: "import-policy-1",
    fieldId: "policy_status",
    fieldValue: "current",
  },
  {
    name: "procurement NDJSON",
    profile:
      "examples/smart-cities-ingestion/procurements.yaml",
    input:
      "examples/smart-cities-ingestion/procurements.ndjson",
    format: "ndjson",
    recordId:
      "import-procurement-1",
    fieldId: "amount",
    fieldValue: 185000,
  },
  {
    name: "audit JSON",
    profile:
      "examples/smart-cities-ingestion/audits.yaml",
    input:
      "examples/smart-cities-ingestion/audits.json",
    format: "json",
    recordId: "import-audit-1",
    fieldId: "overall_status",
    fieldValue:
      "satisfactory_with_findings",
  },
];

test("Smart Cities profiles ingest CSV JSON and NDJSON as reviewable draft records with provenance fingerprints", async () => {
  const {
    pool,
    service,
    records,
  } = await setup();

  try {
    for (const fixture of cases) {
      const [
        profileSource,
        input,
      ] = await Promise.all([
        readFile(
          fixture.profile,
          "utf8",
        ),
        readFile(
          fixture.input,
          "utf8",
        ),
      ]);
      const profile =
        parseIngestionProfile(
          profileSource,
          compiled,
        );

      const result =
        await service.run({
          registryId:
            config.registry.id,
          profile,
          format: fixture.format,
          input,
          sourceLabel:
            fixture.input,
          sourceUri:
            "file://" +
            fixture.input,
          actorId:
            "system:smart-cities-import-test",
          reason:
            "Validate downstream structured ingestion profile.",
          now:
            "2026-10-08T03:30:00.000Z",
        });

      assert.equal(
        result.run.status,
        "completed",
        fixture.name,
      );
      assert.equal(
        result.run.createdItems,
        1,
        fixture.name,
      );
      assert.match(
        result.run.inputSha256,
        /^[0-9a-f]{64}$/,
        fixture.name,
      );
      assert.equal(
        result.run.sourceUri,
        "file://" + fixture.input,
      );

      const items =
        await service.listItems(
          config.registry.id,
          result.run.id,
        );
      assert.equal(
        items.length,
        1,
      );
      assert.match(
        items[0].inputFingerprint,
        /^[0-9a-f]{64}$/,
      );

      const stored =
        await records.get(
          config.registry.id,
          fixture.recordId,
        );
      assert.ok(stored);
      assert.equal(
        stored.status,
        "draft",
        fixture.name,
      );
      assert.equal(
        stored.visibility,
        "public",
        fixture.name,
      );
      assert.equal(
        stored.fields[
          fixture.fieldId
        ],
        fixture.fieldValue,
        fixture.name,
      );
      assert.ok(
        stored.tags.includes(
          "imported",
        ),
      );
      assert.ok(
        stored.externalIdentifiers?.some(
          (identifier) =>
            identifier.scheme ===
              "official-record",
        ),
      );
    }
  } finally {
    await pool.end();
  }
});

test("Smart Cities upserts preserve immutable revisions and ingestion audit provenance", async () => {
  const {
    pool,
    service,
    records,
    history,
  } = await setup();

  try {
    const profile =
      parseIngestionProfile(
        await readFile(
          "examples/smart-cities-ingestion/deployments.yaml",
          "utf8",
        ),
        compiled,
      );
    const original =
      await readFile(
        "examples/smart-cities-ingestion/deployments.csv",
        "utf8",
      );

    const first =
      await service.run({
        registryId:
          config.registry.id,
        profile,
        format: "csv",
        input: original,
        sourceLabel:
          "deployments.csv",
        sourceUri:
          "https://example.gov/open-data/deployments.csv",
        actorId: "importer-1",
        reason:
          "Initial synthetic deployment feed.",
        now:
          "2026-10-08T03:31:00.000Z",
      });

    assert.equal(
      first.run.createdItems,
      1,
    );

    const versionsBefore =
      await history.listVersions(
        config.registry.id,
        "import-deployment-1",
      );

    const changed = original
      .replace(
        "event_triggered,30,Thirty-day standard retention",
        "event_triggered,45,Forty-five-day standard retention",
      )
      .replace(
        "Synthetic CSV import for a public camera program",
        "Updated synthetic CSV import for a public camera program",
      );

    const second =
      await service.run({
        registryId:
          config.registry.id,
        profile,
        format: "csv",
        input: changed,
        sourceLabel:
          "deployments.csv",
        sourceUri:
          "https://example.gov/open-data/deployments.csv",
        actorId: "importer-1",
        reason:
          "Refresh synthetic deployment feed.",
        now:
          "2026-10-09T03:31:00.000Z",
      });

    assert.equal(
      second.run.updatedItems,
      1,
    );
    assert.notEqual(
      second.run.inputSha256,
      first.run.inputSha256,
    );

    const stored =
      await records.get(
        config.registry.id,
        "import-deployment-1",
      );
    assert.ok(stored);
    assert.equal(
      stored.fields.retention_days,
      45,
    );
    assert.equal(
      stored.status,
      "draft",
    );

    const versionsAfter =
      await history.listVersions(
        config.registry.id,
        "import-deployment-1",
      );
    assert.ok(
      versionsAfter.length >
        versionsBefore.length,
    );
    assert.ok(
      versionsAfter.some(
        (version) =>
          version.snapshot.fields
            .retention_days === 30,
      ),
    );
    assert.ok(
      versionsAfter.some(
        (version) =>
          version.snapshot.fields
            .retention_days === 45,
      ),
    );

    const events =
      await history.listEvents(
        config.registry.id,
        "import-deployment-1",
        {
          eventTypes: [
            "ingestion.record_updated",
          ],
        },
      );

    assert.equal(events.length, 1);
    assert.equal(
      events[0].actorId,
      "importer-1",
    );
    assert.equal(
      events[0].metadata.profileId,
      "smart-cities-deployment-import",
    );
    assert.match(
      String(
        events[0].metadata
          .inputFingerprint,
      ),
      /^[0-9a-f]{64}$/,
    );
  } finally {
    await pool.end();
  }
});
