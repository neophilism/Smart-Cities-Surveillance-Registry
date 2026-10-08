import assert from "node:assert/strict";
import test from "node:test";

import {
  applySmartCitiesPublicSafetyFallback,
  assertSmartCitiesPublicRecordSafe,
  scanSmartCitiesPublicRecord,
  SmartCitiesPublicSafetyError,
} from "../apps/web/lib/smart-cities-public-safety.ts";
import {
  compileRegistryConfig,
  parseRegistryConfig,
} from "../packages/config/src/index.ts";
import { readFile } from "node:fs/promises";

const config = compileRegistryConfig(
  parseRegistryConfig(
    await readFile(
      "config/registry.yaml",
      "utf8",
    ),
    {
      sourceName: "config/registry.yaml",
    },
  ),
);

const now = "2026-10-08T01:30:00.000Z";

function deployment(overrides = {}) {
  return {
    id: "deployment-public-safety",
    registryId:
      "smart-cities-surveillance-registry",
    recordTypeId: "deployment",
    fields: {
      name: "Example deployment",
      jurisdiction: "Example City",
      deployment_status: "active",
      public_summary:
        "Public-facing description.",
      public_location_scope:
        "Downtown district and adjacent public rights-of-way.",
      ...overrides,
    },
    status: "published",
    visibility: "public",
    externalIdentifiers: [],
    tags: ["synthetic"],
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
  };
}

test("ordinary high-level Smart Cities public records pass the safety boundary", () => {
  assert.deepEqual(
    scanSmartCitiesPublicRecord(
      deployment({
        approved_purpose:
          "Traffic safety and incident response.",
        data_categories: [
          "video",
          "license_plate_data",
        ],
      }),
    ),
    [],
  );
});

test("precise operational coordinates are rejected while broad location scopes remain allowed", () => {
  const issues =
    scanSmartCitiesPublicRecord(
      deployment({
        public_location_scope:
          "Camera pole at 38.8977, -77.0365",
      }),
    );

  assert.ok(
    issues.some(
      (issue) =>
        issue.code ===
        "precise_coordinates",
    ),
  );

  assert.throws(
    () =>
      assertSmartCitiesPublicRecordSafe(
        deployment({
          public_location_scope:
            "GPS: 38.8977, -77.0365",
        }),
      ),
    SmartCitiesPublicSafetyError,
  );
});

test("private network topology, MAC addresses, and credential material are rejected", () => {
  const cases = [
    [
      "private_network_address",
      "Internal controller 10.4.18.7",
    ],
    [
      "hardware_address",
      "Radio BSSID aa:bb:cc:dd:ee:ff",
    ],
    [
      "credential_material",
      "api_key=abcdefgh12345678",
    ],
    [
      "private_key_material",
      "-----BEGIN PRIVATE KEY-----",
    ],
  ];

  for (const [code, value] of cases) {
    const issues =
      scanSmartCitiesPublicRecord(
        deployment({
          public_summary: value,
        }),
      );

    assert.ok(
      issues.some(
        (issue) =>
          issue.code === code,
      ),
      `Expected ${code} for ${value}`,
    );
  }
});

test("individual targets and raw surveillance identifiers are rejected", () => {
  const cases = [
    [
      "individual_target_identifier",
      "target_id: PERSON-4482",
    ],
    [
      "individual_target_identifier",
      "subject name: Example Person",
    ],
    [
      "personal_surveillance_identifier",
      "license plate: ABC1234",
    ],
    [
      "personal_surveillance_identifier",
      "biometric template: 9188ad",
    ],
  ];

  for (const [code, value] of cases) {
    const issues =
      scanSmartCitiesPublicRecord(
        deployment({
          public_summary: value,
        }),
      );

    assert.ok(
      issues.some(
        (issue) =>
          issue.code === code,
      ),
    );
  }
});

test("sensitive external-identifier schemes are rejected", () => {
  const record = deployment();
  record.externalIdentifiers = [
    {
      scheme: "device_id",
      value: "CAMERA-883",
    },
  ];

  const issues =
    scanSmartCitiesPublicRecord(record);

  assert.ok(
    issues.some(
      (issue) =>
        issue.code ===
        "forbidden_public_field",
    ),
  );
});

test("protected fields can pass publication preflight because disclosure removes them from public projection", () => {
  const record = deployment({
    public_summary:
      "Internal controller 10.4.18.7",
  });

  assert.doesNotThrow(() =>
    assertSmartCitiesPublicRecordSafe(
      record,
      {
        protectedFieldIds: [
          "public_summary",
        ],
      },
    ),
  );
});

test("fail-safe projection replaces unsafe legacy content with a public-safety placeholder", () => {
  const record = deployment({
    public_summary:
      "password=abcdefgh12345678",
  });
  const projected =
    applySmartCitiesPublicSafetyFallback(
      config,
      {
        record,
        disclosure: {
          disposition: "disclosed",
          fields: {},
        },
      },
    );

  assert.ok(projected.record);
  assert.equal(
    projected.disclosure.disposition,
    "withheld",
  );
  assert.equal(
    projected.record.fields.name,
    "Record withheld for public-safety review",
  );
  assert.match(
    String(
      projected.record.fields
        .public_summary,
    ),
    /temporarily withheld/i,
  );
  assert.deepEqual(
    projected.record.externalIdentifiers,
    [],
  );
  assert.deepEqual(
    projected.record.tags,
    [],
  );
});
