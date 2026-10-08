import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  parseRegistryConfig,
} from "../packages/config/src/index.ts";
import {
  createDatabasePool,
  PostgresDisclosureRepository,
  PostgresDocumentRepository,
  PostgresPublicationLifecycleService,
  PostgresRecordRepository,
  PostgresRegistryConfigRepository,
  PostgresSourceRepository,
  runMigrations,
} from "../packages/database/src/index.ts";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required for Smart Cities public-safety integration tests.",
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
const now = "2026-10-08T02:00:00.000Z";

function deployment(
  id,
  publicSummary,
  options = {},
) {
  return {
    id,
    registryId,
    recordTypeId: "deployment",
    fields: {
      name: "Public-safety fixture",
      jurisdiction: "Example City",
      deployment_status: "active",
      public_summary: publicSummary,
      public_location_scope:
        options.publicLocationScope ??
        "Downtown district",
    },
    status: options.status ?? "draft",
    visibility:
      options.visibility ?? "public",
    externalIdentifiers: [],
    tags: ["synthetic"],
    createdAt: now,
    updatedAt: now,
    publishedAt:
      options.status === "published"
        ? now
        : undefined,
  };
}

async function setup() {
  const pool = createDatabasePool({
    connectionString: databaseUrl,
    applicationName:
      "smart-cities-public-safety-tests",
  });

  await runMigrations(pool);
  await pool.query(
    "TRUNCATE civic_registry_configurations CASCADE",
  );

  const configs =
    new PostgresRegistryConfigRepository(pool);
  const records =
    new PostgresRecordRepository(
      pool,
      configs,
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
  const disclosure =
    new PostgresDisclosureRepository(
      pool,
      configs,
      records,
      documents,
    );
  const lifecycle =
    new PostgresPublicationLifecycleService(
      pool,
    );

  await configs.upsert(config);

  return {
    pool,
    records,
    disclosure,
    lifecycle,
  };
}

async function publish(
  lifecycle,
  recordId,
) {
  await lifecycle.requestTransition({
    registryId,
    recordId,
    toStatusId: "under_review",
    context: {
      actorId: "editor-1",
      roles: ["editor"],
    },
    now:
      "2026-10-08T02:05:00.000Z",
  });

  const approval =
    await lifecycle.requestTransition({
      registryId,
      recordId,
      toStatusId: "approved",
      context: {
        actorId: "reviewer-1",
        roles: ["reviewer"],
      },
      now:
        "2026-10-08T02:06:00.000Z",
    });

  assert.equal(
    approval.kind,
    "pending_approval",
  );

  await lifecycle.decideTransition({
    registryId,
    requestId: approval.request.id,
    decision: "approved",
    actorId: "publisher-1",
    actorRoles: ["publisher"],
    now:
      "2026-10-08T02:07:00.000Z",
  });

  return lifecycle.requestTransition({
    registryId,
    recordId,
    toStatusId: "published",
    context: {
      actorId: "publisher-1",
      roles: ["publisher"],
    },
    now:
      "2026-10-08T02:08:00.000Z",
  });
}

test("database guard blocks unsafe records from entering a public lifecycle state", async () => {
  const {
    pool,
    records,
  } = await setup();

  try {
    await assert.rejects(
      records.create(
        deployment(
          "unsafe-bootstrap",
          "Controller password=abcdefgh12345678",
          {
            status: "published",
          },
        ),
        {
          bootstrapLifecycle: true,
        },
      ),
      /public-safety boundary rejected/i,
    );

    await assert.rejects(
      records.create(
        deployment(
          "unsafe-coordinate",
          "Synthetic coordinate fixture.",
          {
            status: "published",
            publicLocationScope:
              "38.8977, -77.0365",
          },
        ),
        {
          bootstrapLifecycle: true,
        },
      ),
      /precise_coordinates|public-safety boundary rejected/i,
    );
  } finally {
    await pool.end();
  }
});

test("database guard blocks sensitive external identifiers from public records", async () => {
  const {
    pool,
    records,
  } = await setup();

  try {
    const record = deployment(
      "unsafe-external-identifier",
      "Public-facing summary.",
      {
        status: "published",
      },
    );
    record.externalIdentifiers = [
      {
        scheme: "device_id",
        value: "CAMERA-883",
      },
    ];

    await assert.rejects(
      records.create(
        record,
        {
          bootstrapLifecycle: true,
        },
      ),
      /external identifier scheme|public-safety boundary/i,
    );
  } finally {
    await pool.end();
  }
});

test("field redaction permits canonical sensitive content while preventing its public release", async () => {
  const {
    pool,
    records,
    disclosure,
    lifecycle,
  } = await setup();

  try {
    await records.create(
      deployment(
        "redacted-publication",
        "Internal controller 10.4.18.7",
      ),
    );

    await disclosure.setFieldDisclosure({
      registryId,
      recordId:
        "redacted-publication",
      fieldId: "public_summary",
      disposition: "redacted",
      reason:
        "Operational security",
      publicNote:
        "Network detail removed.",
      updatedAt:
        "2026-10-08T02:03:00.000Z",
      actorId:
        "disclosure-reviewer",
    });

    const result = await publish(
      lifecycle,
      "redacted-publication",
    );

    assert.equal(result.kind, "executed");
    assert.equal(
      result.record.status,
      "published",
    );

    await assert.rejects(
      disclosure.clearFieldDisclosure(
        registryId,
        "redacted-publication",
        "public_summary",
      ),
      /cannot remove disclosure protection/i,
    );

    const stored = await records.get(
      registryId,
      "redacted-publication",
    );

    assert.equal(
      stored?.fields.public_summary,
      "Internal controller 10.4.18.7",
    );
  } finally {
    await pool.end();
  }
});

test("whole-record withholding permits publication as a safe placeholder and cannot be removed while unsafe content remains", async () => {
  const {
    pool,
    records,
    disclosure,
    lifecycle,
  } = await setup();

  try {
    await records.create(
      deployment(
        "withheld-publication",
        "Synthetic withheld fixture.",
        {
          publicLocationScope:
            "GPS: 38.8977, -77.0365",
        },
      ),
    );

    await disclosure.setRecordDisclosure({
      registryId,
      recordId:
        "withheld-publication",
      disposition: "withheld",
      reason:
        "Operational security review",
      publicNote:
        "Record withheld pending safe public generalization.",
      updatedAt:
        "2026-10-08T02:03:00.000Z",
      actorId:
        "disclosure-reviewer",
    });

    const result = await publish(
      lifecycle,
      "withheld-publication",
    );

    assert.equal(result.kind, "executed");

    await assert.rejects(
      disclosure.clearRecordDisclosure(
        registryId,
        "withheld-publication",
      ),
      /cannot expose withheld record/i,
    );
  } finally {
    await pool.end();
  }
});

test("unsafe edits to an already published record are rejected before search/export state can be updated", async () => {
  const {
    pool,
    records,
  } = await setup();

  try {
    const safe = await records.create(
      deployment(
        "published-safe",
        "Public-facing summary.",
        {
          status: "published",
        },
      ),
      {
        bootstrapLifecycle: true,
      },
    );

    await assert.rejects(
      records.update(
        {
          ...safe,
          fields: {
            ...safe.fields,
            public_summary:
              "Radio BSSID aa:bb:cc:dd:ee:ff",
          },
          updatedAt:
            "2026-10-08T02:20:00.000Z",
        },
      ),
      /public-safety boundary rejected/i,
    );

    const after = await records.get(
      registryId,
      safe.id,
    );

    assert.equal(
      after?.fields.public_summary,
      "Public-facing summary.",
    );
  } finally {
    await pool.end();
  }
});

test("non-public records may retain sensitive canonical detail for authorized review", async () => {
  const {
    pool,
    records,
  } = await setup();

  try {
    const created = await records.create(
      deployment(
        "private-sensitive",
        "Controller at 192.168.8.20",
        {
          visibility: "private",
        },
      ),
    );

    assert.equal(
      created.visibility,
      "private",
    );
    assert.equal(
      created.fields.public_summary,
      "Controller at 192.168.8.20",
    );
  } finally {
    await pool.end();
  }
});
