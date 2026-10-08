import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  compileRegistryConfig,
  parseRegistryConfig,
} from "../packages/config/src/index.ts";
import {
  createDatabasePool,
  runMigrations,
  seedRegistry,
} from "../packages/database/src/index.ts";
import {
  loadSmartCitiesJurisdictionDetail,
  loadSmartCitiesJurisdictionSummaries,
} from "../apps/web/lib/smart-cities-jurisdictions.ts";
import {
  scanSmartCitiesPublicPayload,
} from "../apps/web/lib/smart-cities-public-safety.ts";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required for Smart Cities jurisdiction integration tests.",
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
      "smart-cities-jurisdiction-tests",
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

test("jurisdiction explorer summarizes public deployment and agency records", async () => {
  const pool = await setup();

  try {
    const summaries =
      await loadSmartCitiesJurisdictionSummaries(
        pool,
        compiled,
      );

    assert.deepEqual(
      summaries,
      [
        {
          name: "Harborview",
          deployments: 2,
          activeDeployments: 1,
          agencies: 2,
        },
      ],
    );
  } finally {
    await pool.end();
  }
});

test("jurisdiction detail exposes connected accountability context and public deadlines", async () => {
  const pool = await setup();

  try {
    const detail =
      await loadSmartCitiesJurisdictionDetail(
        pool,
        compiled,
        "Harborview",
        {
          now:
            "2026-10-01T00:00:00.000Z",
        },
      );

    assert.ok(detail);
    assert.equal(
      detail.deployments.length,
      2,
    );
    assert.ok(
      detail.totalConnectedRecords >= 10,
    );
    assert.equal(
      detail.recordTypeCounts
        .deployment,
      2,
    );
    assert.ok(
      detail.recordTypeCounts.agency >=
        2,
    );
    assert.ok(
      detail.recordTypeCounts.vendor >=
        2,
    );
    assert.ok(
      detail.upcomingDeadlines.some(
        (deadline) =>
          deadline.deadlineTypeId ===
          "violation_remediation_due",
      ),
    );
    assert.ok(
      detail.upcomingDeadlines.some(
        (deadline) =>
          deadline.deadlineTypeId ===
          "deployment_audit_due",
      ),
    );
  } finally {
    await pool.end();
  }
});

test("public map exposes only broad safe location scopes and never device coordinates", async () => {
  const pool = await setup();

  try {
    const detail =
      await loadSmartCitiesJurisdictionDetail(
        pool,
        compiled,
        "Harborview",
      );

    assert.ok(detail);
    assert.equal(
      detail.mapScopes.length,
      2,
    );

    for (const scope of detail.mapScopes) {
      assert.deepEqual(
        scanSmartCitiesPublicPayload(
          scope,
          "jurisdiction.map",
        ),
        [],
        scope.label,
      );
      assert.doesNotMatch(
        scope.label,
        /[-+]?d{1,2}.d{4,}s*,s*[-+]?d{1,3}.d{4,}/,
      );
    }

    assert.ok(
      detail.mapScopes.some(
        (scope) =>
          scope.label.includes(
            "Downtown commercial district",
          ),
      ),
    );
    assert.ok(
      detail.mapScopes.some(
        (scope) =>
          scope.label.includes(
            "Municipal parking facilities",
          ),
      ),
    );
  } finally {
    await pool.end();
  }
});

test("whole-record withholding removes a deployment from jurisdiction counts and map scopes", async () => {
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
        "demo-deployment-transit-pilot",
        "Synthetic jurisdiction disclosure test.",
        "2026-10-02T00:00:00.000Z",
      ],
    );

    const summaries =
      await loadSmartCitiesJurisdictionSummaries(
        pool,
        compiled,
      );
    const harborview =
      summaries.find(
        (summary) =>
          summary.name ===
          "Harborview",
      );

    assert.ok(harborview);
    assert.equal(
      harborview.deployments,
      1,
    );

    const detail =
      await loadSmartCitiesJurisdictionDetail(
        pool,
        compiled,
        "Harborview",
      );

    assert.ok(detail);
    assert.equal(
      detail.deployments.length,
      1,
    );
    assert.ok(
      detail.deployments.every(
        (deployment) =>
          deployment.id !==
          "demo-deployment-transit-pilot",
      ),
    );
    assert.ok(
      detail.mapScopes.every(
        (scope) =>
          !scope.deployments.some(
            (deployment) =>
              deployment.id ===
              "demo-deployment-transit-pilot",
          ),
      ),
    );
  } finally {
    await pool.end();
  }
});
