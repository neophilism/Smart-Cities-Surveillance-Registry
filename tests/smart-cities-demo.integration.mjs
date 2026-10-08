import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  compileRegistryConfig,
  parseRegistryConfig,
} from "../packages/config/src/index.ts";
import {
  createDatabasePool,
  PostgresCitationRepository,
  PostgresDeadlineService,
  PostgresDocumentRepository,
  PostgresRecordRepository,
  PostgresRegistryConfigRepository,
  PostgresRelationshipGraphRepository,
  PostgresSearchProvider,
  PostgresSourceRepository,
  runMigrations,
  seedRegistry,
} from "../packages/database/src/index.ts";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required for Smart Cities demo integration tests.",
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
const compiled = compileRegistryConfig(config);
const seed = JSON.parse(
  await readFile(
    "examples/smart-cities-demo/seed.json",
    "utf8",
  ),
);
const registryId = config.registry.id;

async function setup() {
  const pool = createDatabasePool({
    connectionString: databaseUrl,
    applicationName:
      "smart-cities-demo-tests",
  });

  await runMigrations(pool);
  await pool.query(
    "TRUNCATE civic_registry_configurations CASCADE",
  );

  const result = await seedRegistry(
    pool,
    config,
    seed,
  );

  const configs =
    new PostgresRegistryConfigRepository(pool);
  const deadlines =
    new PostgresDeadlineService(pool);
  const records =
    new PostgresRecordRepository(
      pool,
      configs,
      deadlines,
    );
  const sources =
    new PostgresSourceRepository(
      pool,
      configs,
    );
  const documents =
    new PostgresDocumentRepository(
      pool,
      configs,
      sources,
    );
  const citations =
    new PostgresCitationRepository(
      pool,
      configs,
      records,
      sources,
      documents,
    );

  return {
    pool,
    result,
    deadlines,
    graph:
      new PostgresRelationshipGraphRepository(
        pool,
      ),
    search:
      new PostgresSearchProvider(pool),
    citations,
  };
}

test("demo seed materializes the complete synthetic dataset", async () => {
  const {
    pool,
    result,
  } = await setup();

  try {
    assert.equal(
      result.sourcesCreated,
      seed.sources.length,
    );
    assert.equal(
      result.documentsCreated,
      seed.documents.length,
    );
    assert.equal(
      result.recordsCreated,
      seed.records.length,
    );
    assert.equal(
      result.citationsCreated,
      seed.citations.length,
    );
    assert.equal(
      result.relationshipsCreated,
      seed.relationships.length,
    );

    const counts = await pool.query(
      `SELECT
         (SELECT COUNT(*)::int FROM civic_registry_records WHERE registry_id = $1) AS records,
         (SELECT COUNT(*)::int FROM civic_registry_sources WHERE registry_id = $1) AS sources,
         (SELECT COUNT(*)::int FROM civic_registry_documents WHERE registry_id = $1) AS documents,
         (SELECT COUNT(*)::int FROM civic_registry_citations WHERE registry_id = $1) AS citations,
         (SELECT COUNT(*)::int FROM civic_registry_relationships WHERE registry_id = $1) AS relationships`,
      [registryId],
    );

    assert.deepEqual(
      counts.rows[0],
      {
        records: 15,
        sources: 4,
        documents: 6,
        citations: 17,
        relationships: 24,
      },
    );
  } finally {
    await pool.end();
  }
});

test("demo deployment exposes graph, evidence, deadlines, and public search", async () => {
  const {
    pool,
    deadlines,
    graph,
    search,
    citations,
  } = await setup();

  try {
    const deploymentId =
      "demo-deployment-downtown";

    const deadlineInstances =
      await deadlines.listForRecord(
        registryId,
        deploymentId,
      );

    assert.ok(
      deadlineInstances.some(
        (deadline) =>
          deadline.deadlineTypeId ===
          "deployment_audit_due",
      ),
    );
    assert.equal(
      deadlineInstances.find(
        (deadline) =>
          deadline.deadlineTypeId ===
          "deployment_audit_due",
      )?.dueAt,
      "2027-01-15T23:59:59.999Z",
    );

    const evidence =
      await citations.listEvidenceForRecord(
        registryId,
        deploymentId,
        {
          visibility: "public",
          limit: 100,
        },
      );

    assert.equal(evidence.length, 7);
    assert.ok(
      evidence.every(
        (item) =>
          item.document &&
          item.source &&
          item.document.sha256,
      ),
    );

    const relationshipGraph =
      await graph.getGraph({
        registryId,
        rootRecordId: deploymentId,
        depth: 2,
        visibility: "public",
        statusIds: ["published"],
        maxNodes: 100,
      });

    assert.ok(relationshipGraph);

    const graphNodes = new Set(
      relationshipGraph.nodes.map(
        (node) => node.record.id,
      ),
    );

    for (const id of [
      "demo-tech-fixed-camera",
      "demo-vendor-civic-vision",
      "demo-agency-public-safety",
      "demo-authorization-council",
      "demo-policy-surveillance-use",
      "demo-procurement-camera",
      "demo-audit-privacy",
      "demo-violation-retention",
      "demo-data-sharing-transportation",
      "demo-agency-transportation",
    ]) {
      assert.ok(
        graphNodes.has(id),
        `Expected demo graph node ${id}`,
      );
    }

    const searchResult =
      await search.search(
        compiled,
        {
          registryId,
          text:
            "Downtown Camera Safety Program",
          visibility: "public",
          statuses: ["published"],
          projection: "public",
          page: 1,
          pageSize: 20,
        },
      );

    assert.ok(
      searchResult.hits.some(
        (hit) =>
          hit.record.id ===
          deploymentId,
      ),
    );
  } finally {
    await pool.end();
  }
});

test("demo seed remains safe and relationship-idempotent on a second run", async () => {
  const {
    pool,
  } = await setup();

  try {
    const second = await seedRegistry(
      pool,
      config,
      seed,
    );

    assert.equal(
      second.recordsCreated,
      0,
    );
    assert.equal(
      second.sourcesCreated,
      0,
    );
    assert.equal(
      second.documentsCreated,
      0,
    );
    assert.equal(
      second.citationsCreated,
      0,
    );
    assert.equal(
      second.relationshipsCreated,
      0,
    );
    assert.equal(
      second.relationshipsReplaced,
      0,
    );
  } finally {
    await pool.end();
  }
});
