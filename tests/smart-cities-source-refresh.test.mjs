import assert from "node:assert/strict";
import test from "node:test";

import {
  validateOfficialSourceCatalog,
} from "../packages/smart-cities-refresh/src/index.ts";

const empty = {
  schemaVersion: 1,
  registryId: "smart-cities-surveillance-registry",
  sources: [],
};

test("official refresh catalog accepts an empty fail-closed deployment", () => {
  assert.deepEqual(validateOfficialSourceCatalog(empty), empty);
});

function source() {
  return {
    id: "example-inventory",
    enabled: false,
    adapter: {
      kind: "socrata",
      settings: {
        id: "example-inventory",
        label: "Synthetic example inventory",
        allowedHosts: ["data.example.gov"],
        endpoint: "https://data.example.gov/resource/example.json",
        mapping: {
          recordIdField: "id",
          titleField: "name",
          fieldMap: {},
        },
      },
    },
    ingestionProfile: {
      id: "example-profile",
      recordTypeId: "deployment",
      mode: "upsert",
      recordId: { path: "id" },
      fields: { name: { path: "title" } },
      status: { literal: "draft" },
    },
    refresh: {
      intervalSeconds: 3600,
      staleAfterSeconds: 7200,
    },
  };
}

test("official refresh forbids automatically published input", () => {
  const bad = source();
  bad.ingestionProfile.status = { literal: "published" };
  assert.throws(
    () => validateOfficialSourceCatalog({ ...empty, sources: [bad] }),
    /draft-only/,
  );
});

test("official refresh rejects non-allowlisted destinations and credentials", () => {
  const bad = source();
  bad.adapter.settings.endpoint = "https://attacker.example/resource/example.json";
  assert.throws(
    () => validateOfficialSourceCatalog({ ...empty, sources: [bad] }),
    /approved host/,
  );
  bad.adapter.settings.endpoint =
    "https://user:password@data.example.gov/resource/example.json";
  assert.throws(
    () => validateOfficialSourceCatalog({ ...empty, sources: [bad] }),
    /approved host/,
  );
});

test("official refresh detects duplicate IDs, lifecycle bypass, and short cadences", () => {
  const one = source();
  assert.throws(
    () => validateOfficialSourceCatalog({ ...empty, sources: [one, one] }),
    /Duplicate/,
  );
  one.ingestionProfile.allowLifecycleBootstrap = true;
  assert.throws(
    () => validateOfficialSourceCatalog({ ...empty, sources: [one] }),
    /draft-only/,
  );
  delete one.ingestionProfile.allowLifecycleBootstrap;
  one.refresh.intervalSeconds = 2;
  assert.throws(
    () => validateOfficialSourceCatalog({ ...empty, sources: [one] }),
    /cadence/,
  );
});
