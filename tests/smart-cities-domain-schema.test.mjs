import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  loadRegistryConfig,
} from "../packages/config/src/index.ts";
import {
  validateRegistryRecord,
} from "../packages/core/src/index.ts";

const source = await readFile(
  "config/registry.yaml",
  "utf8",
);
const compiled = loadRegistryConfig(source, {
  sourceName: "config/registry.yaml",
});
const registry = compiled.definition;

const expectedRecordTypes = [
  "agency",
  "audit",
  "authorization",
  "data_sharing",
  "deployment",
  "policy",
  "procurement",
  "technology",
  "vendor",
  "violation",
];

test("Smart Cities schema compiles with the ten canonical PR 2 record types", () => {
  assert.equal(
    registry.id,
    "smart-cities-surveillance-registry",
  );
  assert.equal(
    registry.defaultRecordTypeId,
    "deployment",
  );
  assert.equal(
    registry.publicByDefault,
    true,
  );
  assert.deepEqual(
    [...compiled.recordTypesById.keys()].sort(),
    expectedRecordTypes,
  );
});

test("each canonical record type has a required searchable title field", () => {
  for (const recordType of registry.recordTypes) {
    const title = recordType.fields.find(
      (field) =>
        field.id === recordType.titleFieldId,
    );

    assert.ok(
      title,
      `${recordType.id} must define its title field`,
    );
    assert.equal(
      title.required,
      true,
      `${recordType.id} title must be required`,
    );
    assert.equal(
      title.searchable,
      true,
      `${recordType.id} title must be searchable`,
    );
  }
});

test("deployment schema captures public accountability fields without operational coordinates", () => {
  const deployment =
    compiled.getRecordType("deployment");

  assert.equal(
    deployment.fieldsById.get(
      "public_location_scope",
    )?.type,
    "text",
  );
  assert.equal(
    deployment.fieldsById.get(
      "retention_days",
    )?.type,
    "integer",
  );
  assert.equal(
    deployment.fieldsById.get(
      "legal_process_requirement",
    )?.type,
    "enum",
  );

  const fieldIds = new Set(
    deployment.definition.fields.map(
      (field) => field.id,
    ),
  );

  for (const forbidden of [
    "latitude",
    "longitude",
    "coordinates",
    "device_ip",
    "credential",
    "target_person",
  ]) {
    assert.equal(
      fieldIds.has(forbidden),
      false,
      `deployment schema must not include operational field ${forbidden}`,
    );
  }
});

test("domain enumerations include accountability-relevant states", () => {
  const deploymentStatus =
    compiled.getField(
      "deployment",
      "deployment_status",
    );
  const incidentStatus =
    compiled.getField(
      "violation",
      "incident_status",
    );
  const assessmentType =
    compiled.getField(
      "audit",
      "assessment_type",
    );

  assert.ok(
    deploymentStatus.options?.some(
      (option) => option.value === "retired",
    ),
  );
  assert.ok(
    incidentStatus.options?.some(
      (option) =>
        option.value === "substantiated",
    ),
  );
  assert.ok(
    assessmentType.options?.some(
      (option) =>
        option.value ===
        "civil_rights_assessment",
    ),
  );
});

test("representative deployment records validate against the domain schema", () => {
  const now = "2026-10-07T22:00:00.000Z";
  const record = {
    id: "deployment-example",
    registryId: registry.id,
    recordTypeId: "deployment",
    fields: {
      name: "Example public safety camera program",
      jurisdiction: "Example City",
      jurisdiction_type: "city",
      deployment_status: "active",
      public_summary:
        "Synthetic public-facing deployment used for schema validation.",
      public_location_scope:
        "Selected public rights-of-way; no precise device locations included.",
      data_categories: [
        "video",
        "derived_analytics",
      ],
      retention_days: 30,
      legal_process_requirement:
        "policy_authorization",
      public_information_url:
        "https://example.gov/surveillance/program",
    },
    status: "active",
    visibility: "public",
    externalIdentifiers: [],
    tags: ["synthetic"],
    createdAt: now,
    updatedAt: now,
  };

  assert.deepEqual(
    validateRegistryRecord(
      record,
      registry,
    ),
    [],
  );
});

test("record validation rejects missing required fields and unsupported enum values", () => {
  const now = "2026-10-07T22:00:00.000Z";
  const issues = validateRegistryRecord(
    {
      id: "invalid-deployment",
      registryId: registry.id,
      recordTypeId: "deployment",
      fields: {
        name: "Invalid example",
        deployment_status:
          "secretly_active",
        public_summary:
          "Invalid synthetic record.",
      },
      status: "active",
      visibility: "public",
      createdAt: now,
      updatedAt: now,
    },
    registry,
  );

  assert.ok(
    issues.some(
      (issue) =>
        issue.code ===
          "required_field_missing" &&
        issue.path.endsWith(
          ".jurisdiction",
        ),
    ),
  );
  assert.ok(
    issues.some(
      (issue) =>
        issue.code ===
          "invalid_field_value" &&
        issue.path.endsWith(
          ".deployment_status",
        ),
    ),
  );
});

test("presentation exposes useful default browse fields for every record type", () => {
  for (const recordTypeId of expectedRecordTypes) {
    const recordType =
      compiled.getRecordType(
        recordTypeId,
      );

    assert.ok(
      recordType.listFields.length >= 2,
      `${recordTypeId} needs a useful default list presentation`,
    );
    assert.ok(
      recordType.defaultSort,
      `${recordTypeId} needs a deterministic default sort`,
    );
  }
});
