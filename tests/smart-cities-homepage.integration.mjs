import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  parseRegistryConfig,
} from "../packages/config/src/index.ts";
import {
  createDatabasePool,
  runMigrations,
  seedRegistry,
} from "../packages/database/src/index.ts";
import {
  loadSmartCitiesHomepageData,
} from "../apps/web/lib/smart-cities-homepage.ts";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required for Smart Cities homepage integration tests.",
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
const seed = JSON.parse(
  await readFile(
    "examples/smart-cities-demo/seed.json",
    "utf8",
  ),
);

async function setup() {
  const pool = createDatabasePool({
    connectionString: databaseUrl,
    applicationName:
      "smart-cities-homepage-tests",
  });

  await runMigrations(pool);
  await pool.query(
    "TRUNCATE civic_registry_configurations CASCADE",
  );
  await seedRegistry(
    pool,
    config,
    seed,
  );

  return pool;
}

test("homepage aggregates live public registry counts", async () => {
  const pool = await setup();

  try {
    const data =
      await loadSmartCitiesHomepageData(
        pool,
        {
          now:
            "2026-10-01T00:00:00.000Z",
        },
      );

    assert.ok(data);
    assert.equal(
      data.totalRecords,
      15,
    );
    assert.equal(data.deployments, 2);
    assert.equal(
      data.technologies,
      2,
    );
    assert.equal(data.agencies, 2);
    assert.equal(data.vendors, 2);
    assert.equal(data.audits, 1);
    assert.equal(data.incidents, 1);

    const counts = new Map(
      data.recordTypes.map(
        (recordType) => [
          recordType.id,
          recordType.count,
        ],
      ),
    );

    assert.equal(
      counts.get("deployment"),
      2,
    );
    assert.equal(
      counts.get("policy"),
      2,
    );
    assert.equal(
      counts.get("authorization"),
      1,
    );
    assert.equal(
      counts.get("data_sharing"),
      1,
    );
  } finally {
    await pool.end();
  }
});

test("homepage exposes recent public records and upcoming accountability dates", async () => {
  const pool = await setup();

  try {
    const data =
      await loadSmartCitiesHomepageData(
        pool,
        {
          now:
            "2026-10-01T00:00:00.000Z",
        },
      );

    assert.ok(data);
    assert.equal(
      data.recentRecords.length,
      6,
    );
    assert.ok(
      data.recentRecords.every(
        (record) =>
          record.title.length > 0,
      ),
    );

    assert.ok(
      data.upcomingDeadlines.length > 0,
    );
    assert.equal(
      data.upcomingDeadlines[0]
        .deadlineTypeId,
      "violation_remediation_due",
    );
    assert.equal(
      data.upcomingDeadlines[0]
        .recordId,
      "demo-violation-retention",
    );
    assert.equal(
      data.upcomingDeadlines[0]
        .dueAt,
      "2026-10-31T23:59:59.999Z",
    );

    assert.ok(
      data.upcomingDeadlines.some(
        (deadline) =>
          deadline.deadlineTypeId ===
          "deployment_audit_due",
      ),
    );
    assert.ok(
      data.upcomingDeadlines.some(
        (deadline) =>
          deadline.deadlineTypeId ===
          "procurement_renewal_due",
      ),
    );
  } finally {
    await pool.end();
  }
});

test("homepage omits whole-record-withheld records and their deadlines", async () => {
  const pool = await setup();

  try {
    await pool.query(
      `INSERT INTO civic_registry_record_disclosures (
         registry_id,
         record_id,
         disposition,
         reason,
         updated_at
       )
       VALUES ($1, $2, 'withheld', $3, $4)`,
      [
        config.registry.id,
        "demo-violation-retention",
        "Synthetic homepage disclosure test.",
        "2026-10-02T00:00:00.000Z",
      ],
    );

    const data =
      await loadSmartCitiesHomepageData(
        pool,
        {
          now:
            "2026-10-01T00:00:00.000Z",
        },
      );

    assert.ok(data);
    // Placeholder-mode withholding keeps the record in public counts
    // but removes its contents and accountability dates from homepage
    // detail surfaces.
    assert.equal(
      data.incidents,
      1,
    );
    assert.equal(
      data.totalRecords,
      15,
    );
    assert.ok(
      !data.recentRecords.some(
        (record) =>
          record.id ===
          "demo-violation-retention",
      ),
    );
    assert.ok(
      !data.upcomingDeadlines.some(
        (deadline) =>
          deadline.recordId ===
          "demo-violation-retention",
      ),
    );
  } finally {
    await pool.end();
  }
});
