import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  loadRegistryConfig,
} from "../packages/config/src/index.ts";

const source = await readFile(
  "config/registry.yaml",
  "utf8",
);
const compiled = loadRegistryConfig(source, {
  sourceName: "config/registry.yaml",
});

test("Smart Cities lifecycle separates working states from public history states", () => {
  const lifecycle = compiled.publicationLifecycle;
  assert.ok(lifecycle);

  assert.equal(
    lifecycle.definition.initialStatusId,
    "draft",
  );

  assert.deepEqual(
    new Set(lifecycle.publicStatusIds),
    new Set([
      "published",
      "withdrawn",
      "superseded",
      "archived",
    ]),
  );

  for (const hidden of [
    "draft",
    "under_review",
    "approved",
  ]) {
    assert.equal(
      lifecycle.isPublicStatus(hidden),
      false,
      `${hidden} must not be publicly visible`,
    );
  }

  assert.equal(
    lifecycle.getStatus("published").marksPublished,
    true,
  );
  assert.equal(
    lifecycle.getStatus("archived").terminal,
    true,
  );
});

test("publication requires review and independent approval", () => {
  const lifecycle = compiled.publicationLifecycle;
  assert.ok(lifecycle);

  const submit =
    lifecycle.getTransition(
      "draft",
      "under_review",
    );
  const approve =
    lifecycle.getTransition(
      "under_review",
      "approved",
    );
  const publish =
    lifecycle.getTransition(
      "approved",
      "published",
    );

  assert.deepEqual(
    submit?.allowedRoles,
    ["editor"],
  );
  assert.deepEqual(
    approve?.allowedRoles,
    ["reviewer"],
  );
  assert.deepEqual(
    approve?.approval?.approverRoles,
    ["reviewer", "publisher"],
  );
  assert.equal(
    approve?.approval?.requesterCannotApprove,
    true,
  );
  assert.deepEqual(
    publish?.allowedRoles,
    ["publisher"],
  );
});

test("published Smart Cities records can be withdrawn or retained as superseded history", () => {
  const lifecycle = compiled.publicationLifecycle;
  assert.ok(lifecycle);

  assert.ok(
    lifecycle.getTransition(
      "published",
      "withdrawn",
    ),
  );
  assert.ok(
    lifecycle.getTransition(
      "withdrawn",
      "published",
    ),
  );
  assert.ok(
    lifecycle.getTransition(
      "published",
      "superseded",
    ),
  );
  assert.ok(
    lifecycle.getTransition(
      "superseded",
      "archived",
    ),
  );
});

test("scheduled publication is allowed only from approved records", () => {
  const scheduled =
    compiled.publicationLifecycle
      ?.definition
      .scheduledPublication;

  assert.ok(scheduled);
  assert.equal(scheduled.enabled, true);
  assert.deepEqual(
    scheduled.fromStatusIds,
    ["approved"],
  );
  assert.equal(
    scheduled.targetStatusId,
    "published",
  );
  assert.deepEqual(
    scheduled.allowedRoles,
    ["publisher"],
  );
});

test("Smart Cities disclosure defaults favor accountable placeholders", () => {
  assert.equal(
    compiled.disclosure.withheldRecordBehavior,
    "placeholder",
  );
  assert.equal(
    compiled.disclosure.defaultRedactionText,
    "[REDACTED]",
  );
  assert.equal(
    compiled.disclosure.defaultWithheldFieldText,
    "[WITHHELD]",
  );
  assert.equal(
    compiled.disclosure.withheldRecordTitle,
    "Surveillance registry record withheld",
  );
  assert.equal(
    compiled.disclosure.showReasons,
    true,
  );
  assert.equal(
    compiled.disclosure.showAuthorities,
    true,
  );
});
