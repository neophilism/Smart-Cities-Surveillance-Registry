import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  compileRegistryConfig,
  parseRegistryConfig,
} from "../packages/config/src/index.ts";
import {
  createDatabasePool,
  PostgresSearchProvider,
  runMigrations,
  seedRegistry,
} from "../packages/database/src/index.ts";
import {
  resolveSmartCitiesCandidateRecordIds,
} from "../apps/web/lib/smart-cities-search.ts";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required for Smart Cities advanced search integration tests.",
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
const compiled = compileRegistryConfig(
  config,
);
const seed = JSON.parse(
  await readFile(
    "examples/smart-cities-demo/seed.json",
    "utf8",
  ),
);
const registryId = config.registry.id;
const publicStatuses = [
  ...compiled.publicationLifecycle
    .publicStatusIds,
];

async function setup() {
  const pool = createDatabasePool({
    connectionString: databaseUrl,
    applicationName:
      "smart-cities-advanced-search-tests",
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

  return {
    pool,
    search:
      new PostgresSearchProvider(pool),
  };
}

test("vendor filter expands through technology and procurement to deployments and agencies", async () => {
  const {
    pool,
    search,
  } = await setup();

  try {
    const recordIds =
      await resolveSmartCitiesCandidateRecordIds(
        pool,
        compiled,
        {
          vendorId:
            "demo-vendor-civic-vision",
        },
      );

    assert.ok(recordIds);
    const ids = new Set(recordIds);

    for (const id of [
      "demo-vendor-civic-vision",
      "demo-tech-fixed-camera",
      "demo-procurement-camera",
      "demo-deployment-downtown",
      "demo-agency-public-safety",
    ]) {
      assert.ok(ids.has(id), id);
    }

    const result = await search.search(
      compiled,
      {
        registryId,
        projection: "public",
        visibility: "public",
        statuses: publicStatuses,
        recordIds,
        page: 1,
        pageSize: 2,
      },
    );

    assert.ok(result.total >= 5);
    assert.equal(
      result.hits.length,
      2,
    );
  } finally {
    await pool.end();
  }
});

test("jurisdiction and deployment filters intersect public accountability contexts", async () => {
  const {
    pool,
  } = await setup();

  try {
    const recordIds =
      await resolveSmartCitiesCandidateRecordIds(
        pool,
        compiled,
        {
          jurisdiction: "Harborview",
          deploymentStatus: "active",
          retentionMin: 15,
          retentionMax: 30,
          legalProcess:
            "policy_authorization",
        },
      );

    assert.ok(recordIds);
    const ids = new Set(recordIds);

    assert.ok(
      ids.has(
        "demo-deployment-downtown",
      ),
    );
    assert.ok(
      !ids.has(
        "demo-deployment-transit-pilot",
      ),
    );
    assert.ok(
      ids.has(
        "demo-agency-public-safety",
      ),
    );
    assert.ok(
      ids.has(
        "demo-policy-surveillance-use",
      ),
    );
  } finally {
    await pool.end();
  }
});

test("technology and data-category filters resolve the plate-reader accountability network", async () => {
  const {
    pool,
  } = await setup();

  try {
    const recordIds =
      await resolveSmartCitiesCandidateRecordIds(
        pool,
        compiled,
        {
          technologyCategory:
            "automated_license_plate_reader",
          dataCategory:
            "license_plate_data",
        },
      );

    assert.ok(recordIds);
    const ids = new Set(recordIds);

    assert.ok(
      ids.has(
        "demo-tech-plate-reader",
      ),
    );
    assert.ok(
      ids.has(
        "demo-deployment-transit-pilot",
      ),
    );
    assert.ok(
      ids.has(
        "demo-vendor-civic-analytics",
      ),
    );
    assert.ok(
      !ids.has(
        "demo-tech-fixed-camera",
      ),
    );
  } finally {
    await pool.end();
  }
});

test("policy audit and incident status filters each produce public graph contexts", async () => {
  const {
    pool,
  } = await setup();

  try {
    const [
      policy,
      audit,
      incident,
    ] = await Promise.all([
      resolveSmartCitiesCandidateRecordIds(
        pool,
        compiled,
        {
          policyStatus: "current",
        },
      ),
      resolveSmartCitiesCandidateRecordIds(
        pool,
        compiled,
        {
          auditStatus:
            "satisfactory_with_findings",
        },
      ),
      resolveSmartCitiesCandidateRecordIds(
        pool,
        compiled,
        {
          incidentStatus:
            "remediating",
        },
      ),
    ]);

    assert.ok(
      policy?.includes(
        "demo-policy-surveillance-use",
      ),
    );
    assert.ok(
      audit?.includes(
        "demo-audit-privacy",
      ),
    );
    assert.ok(
      incident?.includes(
        "demo-violation-retention",
      ),
    );
  } finally {
    await pool.end();
  }
});

test("advanced filter with no matching anchors returns an empty candidate list", async () => {
  const {
    pool,
  } = await setup();

  try {
    const recordIds =
      await resolveSmartCitiesCandidateRecordIds(
        pool,
        compiled,
        {
          retentionMax: 1,
        },
      );

    assert.deepEqual(
      recordIds,
      [],
    );
  } finally {
    await pool.end();
  }
});
