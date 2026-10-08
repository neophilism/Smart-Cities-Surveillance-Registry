import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  loadRegistryConfig,
} from "../packages/config/src/index.ts";
import {
  calculateWarningAt,
  presentDeadline,
} from "../packages/deadlines/src/index.ts";

const source = await readFile(
  "config/registry.yaml",
  "utf8",
);
const compiled = loadRegistryConfig(source, {
  sourceName: "config/registry.yaml",
});

const expected = {
  deployment_audit_due: {
    recordTypeId: "deployment",
    fieldId: "next_audit_due_on",
    warningDays: 30,
  },
  policy_review_due: {
    recordTypeId: "policy",
    fieldId: "review_due_on",
    warningDays: 30,
  },
  authorization_expires: {
    recordTypeId: "authorization",
    fieldId: "expires_on",
    warningDays: 30,
  },
  procurement_renewal_due: {
    recordTypeId: "procurement",
    fieldId: "renewal_due_on",
    warningDays: 60,
  },
  procurement_expires: {
    recordTypeId: "procurement",
    fieldId: "ends_on",
    warningDays: 60,
  },
  audit_followup_due: {
    recordTypeId: "audit",
    fieldId: "next_review_due_on",
    warningDays: 30,
  },
  violation_remediation_due: {
    recordTypeId: "violation",
    fieldId: "remediation_due_on",
    warningDays: 14,
  },
  data_sharing_expires: {
    recordTypeId: "data_sharing",
    fieldId: "expires_on",
    warningDays: 30,
  },
};

test("Smart Cities config defines eight public accountability clocks", () => {
  assert.ok(compiled.deadlines);
  assert.equal(
    compiled.deadlines.definitionsById.size,
    Object.keys(expected).length,
  );

  for (const [id, spec] of Object.entries(expected)) {
    const definition =
      compiled.deadlines.getDefinition(id);

    assert.deepEqual(
      definition.recordTypeIds,
      [spec.recordTypeId],
    );
    assert.deepEqual(
      definition.anchor,
      {
        kind: "field",
        fieldId: spec.fieldId,
      },
    );
    assert.deepEqual(
      definition.offset,
      {
        value: 0,
        unit: "calendarDays",
      },
    );
    assert.deepEqual(
      definition.warningOffset,
      {
        value: spec.warningDays,
        unit: "calendarDays",
      },
    );
    assert.equal(
      definition.dateOnlyAnchorTime,
      "end",
    );
    assert.equal(
      definition.publiclyVisible,
      true,
    );
  }
});

test("deployment schema exposes the next public audit date", () => {
  const field = compiled.getField(
    "deployment",
    "next_audit_due_on",
  );

  assert.equal(field.type, "date");
  assert.equal(field.filterable, true);
  assert.equal(field.sortable, true);
});

test("accountability clocks use conservative public warning windows", () => {
  const definition =
    compiled.deadlines.getDefinition(
      "violation_remediation_due",
    );
  const calendar =
    compiled.deadlines.getCalendar(
      definition.calendarId,
    );

  assert.equal(
    calculateWarningAt(
      "2026-11-30T23:59:59.999Z",
      definition,
      calendar,
    ),
    "2026-11-16T23:59:59.999Z",
  );

  const presented = presentDeadline(
    {
      id: "deadline-1",
      registryId:
        "smart-cities-surveillance-registry",
      recordId: "violation-1",
      deadlineTypeId:
        "violation_remediation_due",
      instanceKey: "automatic",
      anchorAt:
        "2026-11-30T23:59:59.999Z",
      dueAt:
        "2026-11-30T23:59:59.999Z",
      state: "open",
      totalPausedSeconds: 0,
      createdAt:
        "2026-10-01T00:00:00.000Z",
      updatedAt:
        "2026-10-01T00:00:00.000Z",
    },
    definition,
    calendar,
    "2026-11-20T12:00:00.000Z",
  );

  assert.equal(presented.urgency, "due_soon");
  assert.equal(
    presented.publiclyVisible,
    true,
  );
});

test("publication lifecycle states do not toll external accountability dates", () => {
  for (const definition of
    compiled.deadlines.definition.definitions) {
    assert.equal(
      definition.pauseWhileStatuses,
      undefined,
      `${definition.id} must not be tolled by editorial lifecycle status`,
    );
  }
});
