import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
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
  PostgresSourceRepository,
  runMigrations,
  seedRegistry,
} from "../packages/database/src/index.ts";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required for Smart Cities record-page integration tests.",
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
const registryId = config.registry.id;

async function setup() {
  const pool = createDatabasePool({
    connectionString: databaseUrl,
    applicationName:
      "smart-cities-record-page-tests",
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
    deadlines,
    graph:
      new PostgresRelationshipGraphRepository(
        pool,
      ),
    citations,
  };
}

test("deployment page backing graph exposes the complete accountability chain", async () => {
  const {
    pool,
    graph,
    citations,
    deadlines,
  } = await setup();

  try {
    const recordId =
      "demo-deployment-downtown";
    const result =
      await graph.getGraph({
        registryId,
        rootRecordId: recordId,
        depth: 2,
        visibility: "public",
        statusIds: ["published"],
        maxNodes: 100,
      });

    assert.ok(result);

    const directTypes = new Set(
      result.edges
        .filter(
          (edge) =>
            edge.fromRecordId ===
              recordId ||
            edge.toRecordId ===
              recordId,
        )
        .map(
          (edge) =>
            edge.relationshipTypeId,
        ),
    );

    for (const relationshipTypeId of [
      "uses-technology",
      "operated-by",
      "authorized-by",
      "governed-by",
      "procured-through",
      "audits-deployment",
      "concerns-deployment",
      "data-sharing-for-deployment",
    ]) {
      assert.ok(
        directTypes.has(
          relationshipTypeId,
        ),
        relationshipTypeId,
      );
    }

    const nodesByType = new Map();

    for (const node of result.nodes) {
      const existing =
        nodesByType.get(
          node.record.recordTypeId,
        ) ?? [];

      existing.push(node.record.id);
      nodesByType.set(
        node.record.recordTypeId,
        existing,
      );
    }

    assert.ok(
      nodesByType
        .get("vendor")
        ?.includes(
          "demo-vendor-civic-vision",
        ),
    );
    assert.ok(
      nodesByType
        .get("technology")
        ?.includes(
          "demo-tech-fixed-camera",
        ),
    );
    assert.ok(
      nodesByType
        .get("agency")
        ?.includes(
          "demo-agency-public-safety",
        ),
    );

    const evidence =
      await citations.listEvidenceForRecord(
        registryId,
        recordId,
        {
          visibility: "public",
          limit: 100,
        },
      );
    assert.equal(evidence.length, 7);

    const deadlineInstances =
      await deadlines.listForRecord(
        registryId,
        recordId,
      );
    assert.ok(
      deadlineInstances.some(
        (deadline) =>
          deadline.deadlineTypeId ===
          "deployment_audit_due",
      ),
    );
  } finally {
    await pool.end();
  }
});

test("technology page backing graph exposes supplier, deployments, and procurement", async () => {
  const {
    pool,
    graph,
  } = await setup();

  try {
    const recordId =
      "demo-tech-fixed-camera";
    const result =
      await graph.getGraph({
        registryId,
        rootRecordId: recordId,
        depth: 2,
        visibility: "public",
        statusIds: ["published"],
        maxNodes: 100,
      });

    assert.ok(result);

    const directTypes = new Set(
      result.edges
        .filter(
          (edge) =>
            edge.fromRecordId ===
              recordId ||
            edge.toRecordId ===
              recordId,
        )
        .map(
          (edge) =>
            edge.relationshipTypeId,
        ),
    );

    assert.ok(
      directTypes.has("supplied-by"),
    );
    assert.ok(
      directTypes.has("uses-technology"),
    );
    assert.ok(
      directTypes.has(
        "procures-technology",
      ),
    );

    const ids = new Set(
      result.nodes.map(
        (node) => node.record.id,
      ),
    );

    assert.ok(
      ids.has(
        "demo-vendor-civic-vision",
      ),
    );
    assert.ok(
      ids.has(
        "demo-deployment-downtown",
      ),
    );
    assert.ok(
      ids.has(
        "demo-procurement-camera",
      ),
    );
  } finally {
    await pool.end();
  }
});


test("agency page backing graph exposes deployments, procurement, policy, authorization, audit, and sharing", async () => {
  const {
    pool,
    graph,
  } = await setup();

  try {
    const recordId =
      "demo-agency-public-safety";
    const result =
      await graph.getGraph({
        registryId,
        rootRecordId: recordId,
        depth: 1,
        visibility: "public",
        statusIds: ["published"],
        maxNodes: 100,
      });

    assert.ok(result);

    const types = new Set(
      result.edges.map(
        (edge) =>
          edge.relationshipTypeId,
      ),
    );

    for (const type of [
      "operated-by",
      "procurement-by",
      "policy-issued-by",
      "authorization-issued-by",
      "audit-by-agency",
      "data-sharing-source",
    ]) {
      assert.ok(
        types.has(type),
        type,
      );
    }
  } finally {
    await pool.end();
  }
});

test("vendor page backing graph exposes supplied technology, contract, connected deployment, and agency", async () => {
  const {
    pool,
    graph,
  } = await setup();

  try {
    const recordId =
      "demo-vendor-civic-vision";
    const result =
      await graph.getGraph({
        registryId,
        rootRecordId: recordId,
        depth: 2,
        visibility: "public",
        statusIds: ["published"],
        maxNodes: 100,
      });

    assert.ok(result);

    const directTypes = new Set(
      result.edges
        .filter(
          (edge) =>
            edge.fromRecordId ===
              recordId ||
            edge.toRecordId ===
              recordId,
        )
        .map(
          (edge) =>
            edge.relationshipTypeId,
        ),
    );

    assert.ok(
      directTypes.has("supplied-by"),
    );
    assert.ok(
      directTypes.has(
        "procurement-with",
      ),
    );

    const ids = new Set(
      result.nodes.map(
        (node) => node.record.id,
      ),
    );

    assert.ok(
      ids.has(
        "demo-deployment-downtown",
      ),
    );
    assert.ok(
      ids.has(
        "demo-agency-public-safety",
      ),
    );
  } finally {
    await pool.end();
  }
});

test("procurement page backing graph exposes spending parties, technology, deployment, evidence, and deadlines", async () => {
  const {
    pool,
    graph,
    citations,
    deadlines,
  } = await setup();

  try {
    const recordId =
      "demo-procurement-camera";
    const result =
      await graph.getGraph({
        registryId,
        rootRecordId: recordId,
        depth: 1,
        visibility: "public",
        statusIds: ["published"],
        maxNodes: 100,
      });

    assert.ok(result);

    const types = new Set(
      result.edges.map(
        (edge) =>
          edge.relationshipTypeId,
      ),
    );

    for (const type of [
      "procurement-by",
      "procurement-with",
      "procures-technology",
      "procured-through",
    ]) {
      assert.ok(
        types.has(type),
        type,
      );
    }

    const evidence =
      await citations.listEvidenceForRecord(
        registryId,
        recordId,
        {
          visibility: "public",
          limit: 100,
        },
      );
    assert.ok(
      evidence.length >= 3,
    );

    const deadlineInstances =
      await deadlines.listForRecord(
        registryId,
        recordId,
      );

    const deadlineTypes = new Set(
      deadlineInstances.map(
        (deadline) =>
          deadline.deadlineTypeId,
      ),
    );

    assert.ok(
      deadlineTypes.has(
        "procurement_renewal_due",
      ),
    );
    assert.ok(
      deadlineTypes.has(
        "procurement_expires",
      ),
    );
  } finally {
    await pool.end();
  }
});


test("policy page exposes issuing agency, governed deployments, data sharing, and review deadline", async () => {
  const {
    pool,
    graph,
    deadlines,
  } = await setup();

  try {
    const recordId =
      "demo-policy-surveillance-use";
    const result =
      await graph.getGraph({
        registryId,
        rootRecordId: recordId,
        depth: 1,
        visibility: "public",
        statusIds: ["published"],
        maxNodes: 100,
      });

    assert.ok(result);

    const types = new Set(
      result.edges.map(
        (edge) =>
          edge.relationshipTypeId,
      ),
    );

    assert.ok(
      types.has("policy-issued-by"),
    );
    assert.ok(
      types.has("governed-by"),
    );

    const deadlineInstances =
      await deadlines.listForRecord(
        registryId,
        recordId,
      );

    assert.ok(
      deadlineInstances.some(
        (deadline) =>
          deadline.deadlineTypeId ===
          "policy_review_due",
      ),
    );
  } finally {
    await pool.end();
  }
});

test("authorization page exposes issuer, authorized deployments, and expiration", async () => {
  const {
    pool,
    graph,
    deadlines,
  } = await setup();

  try {
    const recordId =
      "demo-authorization-council";
    const result =
      await graph.getGraph({
        registryId,
        rootRecordId: recordId,
        depth: 1,
        visibility: "public",
        statusIds: ["published"],
        maxNodes: 100,
      });

    assert.ok(result);

    const types = new Set(
      result.edges.map(
        (edge) =>
          edge.relationshipTypeId,
      ),
    );

    assert.ok(
      types.has(
        "authorization-issued-by",
      ),
    );
    assert.ok(
      types.has("authorized-by"),
    );

    const deadlineInstances =
      await deadlines.listForRecord(
        registryId,
        recordId,
      );

    assert.ok(
      deadlineInstances.some(
        (deadline) =>
          deadline.deadlineTypeId ===
          "authorization_expires",
      ),
    );
  } finally {
    await pool.end();
  }
});

test("audit page exposes deployment, agency, incident findings, and follow-up deadline", async () => {
  const {
    pool,
    graph,
    deadlines,
    citations,
  } = await setup();

  try {
    const recordId =
      "demo-audit-privacy";
    const result =
      await graph.getGraph({
        registryId,
        rootRecordId: recordId,
        depth: 1,
        visibility: "public",
        statusIds: ["published"],
        maxNodes: 100,
      });

    assert.ok(result);

    const types = new Set(
      result.edges.map(
        (edge) =>
          edge.relationshipTypeId,
      ),
    );

    for (const type of [
      "audits-deployment",
      "audit-by-agency",
      "identified-by-audit",
    ]) {
      assert.ok(
        types.has(type),
        type,
      );
    }

    const deadlineInstances =
      await deadlines.listForRecord(
        registryId,
        recordId,
      );

    assert.ok(
      deadlineInstances.some(
        (deadline) =>
          deadline.deadlineTypeId ===
          "audit_followup_due",
      ),
    );

    const evidence =
      await citations.listEvidenceForRecord(
        registryId,
        recordId,
        {
          visibility: "public",
          limit: 100,
        },
      );

    assert.ok(
      evidence.length >= 2,
    );
  } finally {
    await pool.end();
  }
});

test("violation page exposes affected deployment, identifying audit, remediation evidence, and deadline", async () => {
  const {
    pool,
    graph,
    deadlines,
    citations,
  } = await setup();

  try {
    const recordId =
      "demo-violation-retention";
    const result =
      await graph.getGraph({
        registryId,
        rootRecordId: recordId,
        depth: 1,
        visibility: "public",
        statusIds: ["published"],
        maxNodes: 100,
      });

    assert.ok(result);

    const types = new Set(
      result.edges.map(
        (edge) =>
          edge.relationshipTypeId,
      ),
    );

    assert.ok(
      types.has(
        "concerns-deployment",
      ),
    );
    assert.ok(
      types.has(
        "identified-by-audit",
      ),
    );

    const deadlineInstances =
      await deadlines.listForRecord(
        registryId,
        recordId,
      );

    assert.ok(
      deadlineInstances.some(
        (deadline) =>
          deadline.deadlineTypeId ===
          "violation_remediation_due",
      ),
    );

    const evidence =
      await citations.listEvidenceForRecord(
        registryId,
        recordId,
        {
          visibility: "public",
          limit: 100,
        },
      );

    assert.ok(
      evidence.length >= 2,
    );
  } finally {
    await pool.end();
  }
});
