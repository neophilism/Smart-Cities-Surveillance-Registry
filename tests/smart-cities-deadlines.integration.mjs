import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  parseRegistryConfig,
} from "../packages/config/src/index.ts";
import {
  createDatabasePool,
  PostgresDeadlineService,
  PostgresPublicationLifecycleService,
  PostgresRecordRepository,
  PostgresRegistryConfigRepository,
  runMigrations,
} from "../packages/database/src/index.ts";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required for Smart Cities deadline integration tests.",
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
const registryId = config.registry.id;
const createdAt =
  "2026-10-01T00:00:00.000Z";

function record(
  id,
  recordTypeId,
  fields,
) {
  return {
    id,
    registryId,
    recordTypeId,
    fields,
    status: "published",
    visibility: "public",
    tags: ["synthetic"],
    externalIdentifiers: [],
    createdAt,
    updatedAt: createdAt,
    publishedAt: createdAt,
  };
}

async function setup() {
  const pool = createDatabasePool({
    connectionString: databaseUrl,
    applicationName:
      "smart-cities-deadline-tests",
  });

  await runMigrations(pool);
  await pool.query(
    "TRUNCATE civic_registry_configurations CASCADE",
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
  const lifecycle =
    new PostgresPublicationLifecycleService(
      pool,
      deadlines,
    );

  await configs.upsert(config);

  return {
    pool,
    records,
    deadlines,
    lifecycle,
  };
}

test("Smart Cities records materialize all configured public accountability dates", async () => {
  const {
    pool,
    records,
    deadlines,
  } = await setup();

  try {
    const fixtures = [
      record(
        "deployment-deadline",
        "deployment",
        {
          name: "Deadline deployment",
          jurisdiction: "Example City",
          deployment_status: "active",
          public_summary:
            "Synthetic deployment deadline fixture.",
          next_audit_due_on: "2026-12-15",
        },
      ),
      record(
        "policy-deadline",
        "policy",
        {
          title: "Deadline policy",
          policy_type: "privacy_policy",
          review_due_on: "2027-01-15",
        },
      ),
      record(
        "authorization-deadline",
        "authorization",
        {
          title: "Deadline authorization",
          authorization_type:
            "pilot_authorization",
          approving_body:
            "Example City Council",
          expires_on: "2026-12-31",
        },
      ),
      record(
        "procurement-deadline",
        "procurement",
        {
          title: "Deadline procurement",
          procurement_type: "contract",
          renewal_due_on: "2026-11-30",
          ends_on: "2027-02-28",
        },
      ),
      record(
        "audit-deadline",
        "audit",
        {
          title: "Deadline audit",
          assessment_type:
            "compliance_audit",
          next_review_due_on: "2027-03-01",
        },
      ),
      record(
        "violation-deadline",
        "violation",
        {
          title: "Deadline incident",
          incident_type:
            "policy_violation",
          incident_status:
            "remediating",
          summary:
            "Synthetic remediation fixture.",
          remediation_due_on:
            "2026-11-15",
        },
      ),
      record(
        "sharing-deadline",
        "data_sharing",
        {
          title:
            "Deadline data-sharing arrangement",
          sharing_type:
            "routine_interagency",
          purpose:
            "Synthetic sharing deadline fixture.",
          expires_on: "2027-04-30",
        },
      ),
    ];

    for (const item of fixtures) {
      await records.create(item, {
        bootstrapLifecycle: true,
        context: {
          actorId:
            "system:deadline-fixture",
          reason:
            "Create synthetic published accountability deadline fixture.",
        },
      });
    }

    const expectedByRecord = new Map([
      [
        "deployment-deadline",
        [
          [
            "deployment_audit_due",
            "2026-12-15T23:59:59.999Z",
          ],
        ],
      ],
      [
        "policy-deadline",
        [
          [
            "policy_review_due",
            "2027-01-15T23:59:59.999Z",
          ],
        ],
      ],
      [
        "authorization-deadline",
        [
          [
            "authorization_expires",
            "2026-12-31T23:59:59.999Z",
          ],
        ],
      ],
      [
        "procurement-deadline",
        [
          [
            "procurement_renewal_due",
            "2026-11-30T23:59:59.999Z",
          ],
          [
            "procurement_expires",
            "2027-02-28T23:59:59.999Z",
          ],
        ],
      ],
      [
        "audit-deadline",
        [
          [
            "audit_followup_due",
            "2027-03-01T23:59:59.999Z",
          ],
        ],
      ],
      [
        "violation-deadline",
        [
          [
            "violation_remediation_due",
            "2026-11-15T23:59:59.999Z",
          ],
        ],
      ],
      [
        "sharing-deadline",
        [
          [
            "data_sharing_expires",
            "2027-04-30T23:59:59.999Z",
          ],
        ],
      ],
    ]);

    for (const [
      recordId,
      expected,
    ] of expectedByRecord) {
      const instances =
        await deadlines.listForRecord(
          registryId,
          recordId,
        );

      assert.equal(
        instances.length,
        expected.length,
        `Unexpected deadline count for ${recordId}`,
      );

      for (const [
        deadlineTypeId,
        dueAt,
      ] of expected) {
        const instance = instances.find(
          (item) =>
            item.deadlineTypeId ===
            deadlineTypeId,
        );

        assert.ok(
          instance,
          `Missing ${deadlineTypeId} for ${recordId}`,
        );
        assert.equal(
          instance.anchorAt,
          dueAt,
        );
        assert.equal(
          instance.dueAt,
          dueAt,
        );
        assert.equal(
          instance.state,
          "open",
        );
      }
    }
  } finally {
    await pool.end();
  }
});

test("changing a published accountability date automatically updates its deadline", async () => {
  const {
    pool,
    records,
    deadlines,
  } = await setup();

  try {
    await records.create(
      record(
        "deployment-update",
        "deployment",
        {
          name: "Update deployment",
          jurisdiction: "Example City",
          deployment_status: "active",
          public_summary:
            "Synthetic update fixture.",
          next_audit_due_on:
            "2026-12-15",
        },
      ),
      {
        bootstrapLifecycle: true,
      },
    );

    const current = await records.get(
      registryId,
      "deployment-update",
    );
    assert.ok(current);

    await records.update(
      {
        ...current,
        fields: {
          ...current.fields,
          next_audit_due_on:
            "2027-01-31",
        },
        updatedAt:
          "2026-10-10T00:00:00.000Z",
      },
      {
        context: {
          actorId: "editor-deadline",
          reason:
            "Updated next audit date from a newer public source.",
        },
      },
    );

    const instances =
      await deadlines.listForRecord(
        registryId,
        "deployment-update",
      );

    assert.equal(instances.length, 1);
    assert.equal(
      instances[0].anchorAt,
      "2027-01-31T23:59:59.999Z",
    );
    assert.equal(
      instances[0].dueAt,
      "2027-01-31T23:59:59.999Z",
    );
  } finally {
    await pool.end();
  }
});

test("withdrawing a registry record does not toll an external accountability date", async () => {
  const {
    pool,
    records,
    deadlines,
    lifecycle,
  } = await setup();

  try {
    await records.create(
      record(
        "deployment-withdrawn",
        "deployment",
        {
          name: "Withdrawn deployment",
          jurisdiction: "Example City",
          deployment_status: "active",
          public_summary:
            "Synthetic withdrawal fixture.",
          next_audit_due_on:
            "2026-12-15",
        },
      ),
      {
        bootstrapLifecycle: true,
      },
    );

    const before = (
      await deadlines.listForRecord(
        registryId,
        "deployment-withdrawn",
      )
    )[0];

    assert.ok(before);

    await lifecycle.requestTransition({
      registryId,
      recordId:
        "deployment-withdrawn",
      toStatusId: "withdrawn",
      context: {
        actorId: "publisher-1",
        roles: ["publisher"],
        reason:
          "Withdraw record from current use while preserving accountability history.",
      },
      now:
        "2026-10-15T12:00:00.000Z",
    });

    const after = (
      await deadlines.listForRecord(
        registryId,
        "deployment-withdrawn",
      )
    )[0];

    assert.ok(after);
    assert.equal(after.state, "open");
    assert.equal(
      after.dueAt,
      before.dueAt,
    );
    assert.equal(
      after.pausedAt,
      undefined,
    );
    assert.equal(
      after.totalPausedSeconds,
      0,
    );
  } finally {
    await pool.end();
  }
});
