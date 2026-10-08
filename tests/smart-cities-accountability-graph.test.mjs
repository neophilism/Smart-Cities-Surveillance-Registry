import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  loadRegistryConfig,
} from "../packages/config/src/index.ts";
import {
  presentRelationship,
  relationshipDirectionLabel,
} from "../packages/registry/src/index.ts";

const source = await readFile(
  "config/registry.yaml",
  "utf8",
);
const compiled = loadRegistryConfig(source, {
  sourceName: "config/registry.yaml",
});

const expectedEndpoints = {
  "uses-technology": ["deployment", "technology"],
  "operated-by": ["deployment", "agency"],
  "supplied-by": ["technology", "vendor"],
  "authorized-by": ["deployment", "authorization"],
  "authorization-issued-by": ["authorization", "agency"],
  "governed-by": ["deployment", "policy"],
  "policy-issued-by": ["policy", "agency"],
  "procured-through": ["deployment", "procurement"],
  "procurement-by": ["procurement", "agency"],
  "procurement-with": ["procurement", "vendor"],
  "procures-technology": ["procurement", "technology"],
  "audits-deployment": ["audit", "deployment"],
  "audit-by-agency": ["audit", "agency"],
  "concerns-deployment": ["violation", "deployment"],
  "identified-by-audit": ["violation", "audit"],
  "data-sharing-for-deployment": ["data_sharing", "deployment"],
  "data-sharing-source": ["data_sharing", "agency"],
  "data-sharing-recipient": ["data_sharing", "agency"],
  "data-sharing-governed-by": ["data_sharing", "policy"],
};

test("Smart Cities defines the complete PR 3 accountability relationship vocabulary", () => {
  assert.equal(
    compiled.relationshipTypesById.size,
    Object.keys(expectedEndpoints).length,
  );

  for (const [id, [from, to]] of Object.entries(
    expectedEndpoints,
  )) {
    const relationship =
      compiled.relationshipTypesById.get(id);

    assert.ok(
      relationship,
      `Missing relationship type ${id}`,
    );
    assert.equal(relationship.directed, true);
    assert.deepEqual(
      relationship.fromRecordTypeIds,
      [from],
    );
    assert.deepEqual(
      relationship.toRecordTypeIds,
      [to],
    );
    assert.ok(relationship.inverseLabel);
  }
});

test("deployment graph covers technology, operator, authorization, policy, procurement, oversight, incidents, and data sharing", () => {
  const deploymentOutbound = new Set(
    [
      "uses-technology",
      "operated-by",
      "authorized-by",
      "governed-by",
      "procured-through",
    ],
  );
  const deploymentInbound = new Set(
    [
      "audits-deployment",
      "concerns-deployment",
      "data-sharing-for-deployment",
    ],
  );

  for (const id of deploymentOutbound) {
    assert.deepEqual(
      compiled.relationshipTypesById.get(id)
        ?.fromRecordTypeIds,
      ["deployment"],
    );
  }

  for (const id of deploymentInbound) {
    assert.deepEqual(
      compiled.relationshipTypesById.get(id)
        ?.toRecordTypeIds,
      ["deployment"],
    );
  }
});

test("directed relationship labels read naturally from either endpoint", () => {
  const type =
    compiled.relationshipTypesById.get(
      "uses-technology",
    );
  assert.ok(type);

  const relationship = {
    id: "dep-tech",
    registryId:
      "smart-cities-surveillance-registry",
    relationshipTypeId:
      "uses-technology",
    fromRecordId: "deployment-1",
    toRecordId: "technology-1",
    createdAt:
      "2026-10-07T22:00:00.000Z",
  };

  assert.equal(
    relationshipDirectionLabel(
      "deployment-1",
      relationship,
      type,
    ),
    "Uses technology",
  );
  assert.equal(
    relationshipDirectionLabel(
      "technology-1",
      relationship,
      type,
    ),
    "Used by deployment",
  );
});

test("relationship presentation preserves Smart Cities semantics", () => {
  const deployment = {
    id: "deployment-1",
    registryId:
      "smart-cities-surveillance-registry",
    recordTypeId: "deployment",
    fields: {
      name: "Example deployment",
      jurisdiction: "Example City",
      deployment_status: "active",
      public_summary: "Synthetic.",
    },
    status: "published",
    visibility: "public",
    createdAt:
      "2026-10-07T22:00:00.000Z",
    updatedAt:
      "2026-10-07T22:00:00.000Z",
  };
  const technology = {
    id: "technology-1",
    registryId:
      "smart-cities-surveillance-registry",
    recordTypeId: "technology",
    fields: {
      name: "Example camera",
      category: "fixed_camera",
    },
    status: "published",
    visibility: "public",
    createdAt:
      "2026-10-07T22:00:00.000Z",
    updatedAt:
      "2026-10-07T22:00:00.000Z",
  };
  const relationship = {
    id: "dep-tech",
    registryId:
      "smart-cities-surveillance-registry",
    relationshipTypeId:
      "uses-technology",
    fromRecordId: deployment.id,
    toRecordId: technology.id,
    createdAt:
      "2026-10-07T22:00:00.000Z",
  };

  const presented = presentRelationship(
    deployment.id,
    relationship,
    technology,
    compiled,
  );

  assert.equal(
    presented.directionLabel,
    "Uses technology",
  );
  assert.equal(
    presented.relatedRecord.title,
    "Example camera",
  );
  assert.equal(presented.directed, true);
});
