import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  parseRegistryConfig,
} from "../packages/config/src/index.ts";
import {
  createDatabasePool,
  PostgresRecordRepository,
  PostgresRegistryConfigRepository,
  PostgresRelationshipGraphRepository,
  PostgresRelationshipRepository,
  runMigrations,
} from "../packages/database/src/index.ts";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required for Smart Cities accountability graph integration tests.",
  );
}

const configSource = await readFile(
  "config/registry.yaml",
  "utf8",
);
const config = parseRegistryConfig(
  configSource,
  {
    sourceName: "config/registry.yaml",
  },
);
const registryId = config.registry.id;
const now = "2026-10-07T22:00:00.000Z";

function record(id, recordTypeId, fields) {
  return {
    id,
    registryId,
    recordTypeId,
    fields,
    status: "published",
    visibility: "public",
    externalIdentifiers: [],
    tags: ["synthetic"],
    createdAt: now,
    updatedAt: now,
  };
}

function relationship(
  id,
  relationshipTypeId,
  fromRecordId,
  toRecordId,
) {
  return {
    id,
    registryId,
    relationshipTypeId,
    fromRecordId,
    toRecordId,
    createdAt: now,
  };
}

async function setup() {
  const pool = createDatabasePool({
    connectionString: databaseUrl,
    applicationName:
      "smart-cities-accountability-graph-tests",
  });

  await runMigrations(pool);
  await pool.query(
    "TRUNCATE civic_registry_configurations CASCADE",
  );

  const configs =
    new PostgresRegistryConfigRepository(pool);
  const records =
    new PostgresRecordRepository(pool, configs);
  const relationships =
    new PostgresRelationshipRepository(
      pool,
      configs,
      records,
    );
  const graph =
    new PostgresRelationshipGraphRepository(pool);

  await configs.upsert(config);

  const fixtures = [
    record(
      "deployment-downtown",
      "deployment",
      {
        name: "Downtown camera program",
        jurisdiction: "Example City",
        deployment_status: "active",
        public_summary:
          "Synthetic public surveillance deployment.",
      },
    ),
    record(
      "technology-camera",
      "technology",
      {
        name: "Example fixed camera",
        category: "fixed_camera",
      },
    ),
    record(
      "agency-police",
      "agency",
      {
        name: "Example Police Department",
        jurisdiction: "Example City",
        agency_type: "police",
      },
    ),
    record(
      "agency-transportation",
      "agency",
      {
        name: "Example Transportation Department",
        jurisdiction: "Example City",
        agency_type: "transportation",
      },
    ),
    record(
      "vendor-camera",
      "vendor",
      {
        name: "Example Camera Vendor",
      },
    ),
    record(
      "policy-privacy",
      "policy",
      {
        title: "Example Surveillance Privacy Policy",
        policy_type: "privacy_policy",
      },
    ),
    record(
      "authorization-council",
      "authorization",
      {
        title: "Example Council Authorization",
        authorization_type:
          "legislative_approval",
        approving_body:
          "Example City Council",
      },
    ),
    record(
      "procurement-camera",
      "procurement",
      {
        title: "Example Camera Contract",
        procurement_type: "contract",
      },
    ),
    record(
      "audit-privacy",
      "audit",
      {
        title: "Example Privacy Assessment",
        assessment_type:
          "privacy_impact_assessment",
      },
    ),
    record(
      "violation-retention",
      "violation",
      {
        title: "Example Retention Finding",
        incident_type:
          "excessive_retention",
        incident_status:
          "substantiated",
        summary:
          "Synthetic accountability finding.",
      },
    ),
    record(
      "sharing-transportation",
      "data_sharing",
      {
        title:
          "Example Transportation Data-Sharing Arrangement",
        sharing_type:
          "routine_interagency",
        purpose:
          "Synthetic data-sharing arrangement for testing.",
      },
    ),
  ];

  for (const item of fixtures) {
    await records.create(item);
  }

  const edges = [
    relationship(
      "edge-deployment-technology",
      "uses-technology",
      "deployment-downtown",
      "technology-camera",
    ),
    relationship(
      "edge-deployment-operator",
      "operated-by",
      "deployment-downtown",
      "agency-police",
    ),
    relationship(
      "edge-technology-vendor",
      "supplied-by",
      "technology-camera",
      "vendor-camera",
    ),
    relationship(
      "edge-deployment-authorization",
      "authorized-by",
      "deployment-downtown",
      "authorization-council",
    ),
    relationship(
      "edge-authorization-agency",
      "authorization-issued-by",
      "authorization-council",
      "agency-police",
    ),
    relationship(
      "edge-deployment-policy",
      "governed-by",
      "deployment-downtown",
      "policy-privacy",
    ),
    relationship(
      "edge-policy-agency",
      "policy-issued-by",
      "policy-privacy",
      "agency-police",
    ),
    relationship(
      "edge-deployment-procurement",
      "procured-through",
      "deployment-downtown",
      "procurement-camera",
    ),
    relationship(
      "edge-procurement-agency",
      "procurement-by",
      "procurement-camera",
      "agency-police",
    ),
    relationship(
      "edge-procurement-vendor",
      "procurement-with",
      "procurement-camera",
      "vendor-camera",
    ),
    relationship(
      "edge-procurement-technology",
      "procures-technology",
      "procurement-camera",
      "technology-camera",
    ),
    relationship(
      "edge-audit-deployment",
      "audits-deployment",
      "audit-privacy",
      "deployment-downtown",
    ),
    relationship(
      "edge-audit-agency",
      "audit-by-agency",
      "audit-privacy",
      "agency-police",
    ),
    relationship(
      "edge-violation-deployment",
      "concerns-deployment",
      "violation-retention",
      "deployment-downtown",
    ),
    relationship(
      "edge-violation-audit",
      "identified-by-audit",
      "violation-retention",
      "audit-privacy",
    ),
    relationship(
      "edge-sharing-deployment",
      "data-sharing-for-deployment",
      "sharing-transportation",
      "deployment-downtown",
    ),
    relationship(
      "edge-sharing-source",
      "data-sharing-source",
      "sharing-transportation",
      "agency-police",
    ),
    relationship(
      "edge-sharing-recipient",
      "data-sharing-recipient",
      "sharing-transportation",
      "agency-transportation",
    ),
    relationship(
      "edge-sharing-policy",
      "data-sharing-governed-by",
      "sharing-transportation",
      "policy-privacy",
    ),
  ];

  for (const edge of edges) {
    await relationships.create(edge);
  }

  return {
    pool,
    records,
    relationships,
    graph,
  };
}

test("Smart Cities deployment graph exposes a multi-hop accountability chain", async () => {
  const { pool, graph } = await setup();

  try {
    const result = await graph.getGraph({
      registryId,
      rootRecordId:
        "deployment-downtown",
      depth: 2,
      visibility: "public",
      maxNodes: 50,
    });

    assert.ok(result);
    const nodeIds = new Set(
      result.nodes.map(
        (node) => node.record.id,
      ),
    );

    for (const expected of [
      "deployment-downtown",
      "technology-camera",
      "agency-police",
      "vendor-camera",
      "policy-privacy",
      "authorization-council",
      "procurement-camera",
      "audit-privacy",
      "violation-retention",
      "sharing-transportation",
      "agency-transportation",
    ]) {
      assert.ok(
        nodeIds.has(expected),
        `Expected graph node ${expected}`,
      );
    }

    const edgeTypes = new Set(
      result.edges.map(
        (edge) =>
          edge.relationshipTypeId,
      ),
    );

    for (const expected of [
      "uses-technology",
      "supplied-by",
      "authorized-by",
      "governed-by",
      "procured-through",
      "audits-deployment",
      "concerns-deployment",
      "data-sharing-for-deployment",
      "data-sharing-recipient",
    ]) {
      assert.ok(
        edgeTypes.has(expected),
        `Expected graph edge type ${expected}`,
      );
    }
  } finally {
    await pool.end();
  }
});

test("relationship persistence enforces Smart Cities endpoint types", async () => {
  const {
    pool,
    relationships,
  } = await setup();

  try {
    await assert.rejects(
      relationships.create(
        relationship(
          "bad-uses-technology",
          "uses-technology",
          "agency-police",
          "technology-camera",
        ),
      ),
      /not allowed as the source/i,
    );

    await assert.rejects(
      relationships.create(
        relationship(
          "bad-supplied-by",
          "supplied-by",
          "technology-camera",
          "agency-police",
        ),
      ),
      /not allowed as the target/i,
    );
  } finally {
    await pool.end();
  }
});

test("relationship-type filters isolate meaningful accountability paths", async () => {
  const { pool, graph } = await setup();

  try {
    const result = await graph.getGraph({
      registryId,
      rootRecordId:
        "deployment-downtown",
      depth: 2,
      relationshipTypeIds: [
        "procured-through",
        "procurement-with",
      ],
      visibility: "public",
      maxNodes: 20,
    });

    assert.ok(result);

    assert.deepEqual(
      new Set(
        result.nodes.map(
          (node) => node.record.id,
        ),
      ),
      new Set([
        "deployment-downtown",
        "procurement-camera",
        "vendor-camera",
      ]),
    );

    assert.deepEqual(
      new Set(
        result.edges.map(
          (edge) =>
            edge.relationshipTypeId,
        ),
      ),
      new Set([
        "procured-through",
        "procurement-with",
      ]),
    );
  } finally {
    await pool.end();
  }
});
