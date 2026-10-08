import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  compileRegistryConfig,
  parseRegistryConfig,
} from "../packages/config/src/index.ts";
import {
  parseIngestionProfile,
} from "../packages/ingestion/src/index.ts";

const registry = compileRegistryConfig(
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

const profiles = [
  [
    "examples/smart-cities-ingestion/deployments.yaml",
    "deployment",
  ],
  [
    "examples/smart-cities-ingestion/policies.yaml",
    "policy",
  ],
  [
    "examples/smart-cities-ingestion/procurements.yaml",
    "procurement",
  ],
  [
    "examples/smart-cities-ingestion/audits.yaml",
    "audit",
  ],
];

test("Smart Cities ingestion profiles compile against the downstream schema", async () => {
  for (const [
    path,
    recordTypeId,
  ] of profiles) {
    const profile =
      parseIngestionProfile(
        await readFile(path, "utf8"),
        registry,
      );

    assert.equal(
      profile.recordTypeId,
      recordTypeId,
      path,
    );
    assert.equal(
      profile.mode,
      "upsert",
      path,
    );
    assert.equal(
      profile.status?.literal,
      "draft",
      path,
    );
    assert.equal(
      profile.visibility?.literal,
      "public",
      path,
    );
    assert.equal(
      profile.allowLifecycleBootstrap,
      false,
      path,
    );
    assert.ok(
      profile.staticTags.includes(
        "imported",
      ),
      path,
    );
  }
});
