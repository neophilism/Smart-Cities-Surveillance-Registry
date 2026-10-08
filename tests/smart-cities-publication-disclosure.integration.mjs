import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  compileRegistryConfig,
  parseRegistryConfig,
} from "../packages/config/src/index.ts";
import {
  createDatabasePool,
  PostgresDisclosureRepository,
  PostgresDocumentRepository,
  PostgresPublicationLifecycleService,
  PostgresRecordHistoryRepository,
  PostgresRecordRepository,
  PostgresRegistryConfigRepository,
  PostgresSearchProvider,
  PostgresSourceRepository,
  runMigrations,
} from "../packages/database/src/index.ts";
import {
  projectRecordForPublic,
} from "../packages/registry/src/index.ts";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required for Smart Cities publication/disclosure integration tests.",
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
const compiled = compileRegistryConfig(config);
const registryId = config.registry.id;

function deployment(
  id,
  status = "draft",
) {
  return {
    id,
    registryId,
    recordTypeId: "deployment",
    fields: {
      name: "Example downtown camera program",
      jurisdiction: "Example City",
      jurisdiction_type: "city",
      deployment_status: "active",
      public_summary:
        "Initial public description.",
      approved_purpose:
        "Sensitive deployment purpose phrase Zephyr.",
      public_location_scope:
        "General downtown district.",
      retention_days: 90,
      legal_process_requirement:
        "policy_authorization",
    },
    status,
    visibility: "public",
    externalIdentifiers: [],
    tags: ["synthetic"],
    createdAt:
      "2026-10-07T20:00:00.000Z",
    updatedAt:
      "2026-10-07T20:00:00.000Z",
  };
}

async function setup() {
  const pool = createDatabasePool({
    connectionString: databaseUrl,
    applicationName:
      "smart-cities-publication-disclosure-tests",
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

  await configs.upsert(config);

  return {
    pool,
    records,
    disclosure,
    history:
      new PostgresRecordHistoryRepository(
        pool,
      ),
    lifecycle:
      new PostgresPublicationLifecycleService(
        pool,
      ),
    search:
      new PostgresSearchProvider(pool),
  };
}

test("Smart Cities records require controlled review, approval, and publication", async () => {
  const {
    pool,
    records,
    lifecycle,
  } = await setup();

  try {
    await assert.rejects(
      records.create(
        deployment(
          "direct-published",
          "published",
        ),
      ),
      /must begin in lifecycle status draft/i,
    );

    const created = await records.create(
      deployment("deployment-1"),
      {
        context: {
          actorId: "editor-1",
          reason:
            "Created surveillance deployment record.",
        },
      },
    );

    assert.equal(created.status, "draft");
    assert.equal(
      compiled.publicationLifecycle?.isPublicStatus(
        created.status,
      ),
      false,
    );

    const reviewed =
      await lifecycle.requestTransition({
        registryId,
        recordId: created.id,
        toStatusId: "under_review",
        context: {
          actorId: "editor-1",
          roles: ["editor"],
          reason:
            "Submit record for publication review.",
        },
        now:
          "2026-10-07T20:10:00.000Z",
      });

    assert.equal(reviewed.kind, "executed");
    assert.equal(
      reviewed.record.status,
      "under_review",
    );

    const approval =
      await lifecycle.requestTransition({
        registryId,
        recordId: created.id,
        toStatusId: "approved",
        context: {
          actorId: "reviewer-1",
          roles: ["reviewer"],
          reason:
            "Approve factual content for publication.",
        },
        now:
          "2026-10-07T20:20:00.000Z",
      });

    assert.equal(
      approval.kind,
      "pending_approval",
    );

    await assert.rejects(
      lifecycle.decideTransition({
        registryId,
        requestId: approval.request.id,
        decision: "approved",
        actorId: "reviewer-1",
        actorRoles: ["reviewer"],
        now:
          "2026-10-07T20:21:00.000Z",
      }),
      /requester cannot approve|cannot approve/i,
    );

    const decision =
      await lifecycle.decideTransition({
        registryId,
        requestId: approval.request.id,
        decision: "approved",
        actorId: "publisher-1",
        actorRoles: ["publisher"],
        note:
          "Independent publication approval.",
        now:
          "2026-10-07T20:22:00.000Z",
      });

    assert.equal(
      decision.record?.status,
      "approved",
    );

    await assert.rejects(
      lifecycle.requestTransition({
        registryId,
        recordId: created.id,
        toStatusId: "published",
        context: {
          actorId: "editor-1",
          roles: ["editor"],
        },
        now:
          "2026-10-07T20:23:00.000Z",
      }),
      /role|required|publish/i,
    );

    const published =
      await lifecycle.requestTransition({
        registryId,
        recordId: created.id,
        toStatusId: "published",
        context: {
          actorId: "publisher-1",
          roles: ["publisher"],
          reason:
            "Publish reviewed registry record.",
        },
        now:
          "2026-10-07T20:30:00.000Z",
      });

    assert.equal(published.kind, "executed");
    assert.equal(
      published.record.status,
      "published",
    );
    assert.equal(
      published.record.publishedAt,
      "2026-10-07T20:30:00.000Z",
    );
    assert.equal(
      compiled.publicationLifecycle?.isPublicStatus(
        published.record.status,
      ),
      true,
    );
  } finally {
    await pool.end();
  }
});

test("corrections are immutable history and disclosure rules protect public projections", async () => {
  const {
    pool,
    records,
    lifecycle,
    history,
    disclosure,
    search,
  } = await setup();

  try {
    await records.create(
      {
        ...deployment("deployment-2"),
        status: "published",
        publishedAt:
          "2026-10-07T20:30:00.000Z",
      },
      {
        bootstrapLifecycle: true,
        context: {
          actorId: "bootstrap-test",
          reason:
            "Synthetic already-published test fixture.",
        },
      },
    );

    const published = await records.get(
      registryId,
      "deployment-2",
    );
    assert.ok(published);

    const corrected = await records.update(
      {
        ...published,
        fields: {
          ...published.fields,
          public_summary:
            "Corrected public description.",
        },
        updatedAt:
          "2026-10-07T20:40:00.000Z",
      },
      {
        context: {
          actorId: "editor-correction",
          reason:
            "Corrected public summary after publication.",
        },
      },
    );

    assert.equal(
      corrected.fields.public_summary,
      "Corrected public description.",
    );

    const versions =
      await history.listVersions(
        registryId,
        corrected.id,
      );

    assert.ok(versions.length >= 2);
    assert.equal(
      versions[0].actorId,
      "editor-correction",
    );
    assert.equal(
      versions[0].reason,
      "Corrected public summary after publication.",
    );
    assert.equal(
      versions[0].snapshot.fields
        .public_summary,
      "Corrected public description.",
    );
    assert.ok(
      versions.some(
        (version) =>
          version.snapshot.fields
            .public_summary ===
          "Initial public description.",
      ),
    );

    await disclosure.setFieldDisclosure({
      registryId,
      recordId: corrected.id,
      fieldId: "approved_purpose",
      disposition: "redacted",
      reason: "Operational security",
      authority:
        "Example public-records exemption",
      publicNote:
        "Operational detail removed.",
      updatedAt:
        "2026-10-07T20:45:00.000Z",
      actorId: "disclosure-reviewer",
    });

    await disclosure.setFieldDisclosure({
      registryId,
      recordId: corrected.id,
      fieldId: "retention_days",
      disposition: "withheld",
      reason:
        "Pending verification of published retention rule",
      updatedAt:
        "2026-10-07T20:46:00.000Z",
      actorId: "disclosure-reviewer",
    });

    const bundle =
      await disclosure.getRecordBundle(
        registryId,
        corrected.id,
      );
    const projected =
      projectRecordForPublic(
        corrected,
        compiled,
        bundle.record ?? null,
        bundle.fields,
      );

    assert.ok(projected.record);
    assert.equal(
      projected.record.fields
        .approved_purpose,
      "[REDACTED]",
    );
    assert.equal(
      projected.record.fields.retention_days,
      "[WITHHELD]",
    );
    assert.equal(
      projected.disclosure.fields
        .approved_purpose.reason,
      "Operational security",
    );
    assert.equal(
      projected.disclosure.fields
        .approved_purpose.authority,
      "Example public-records exemption",
    );

    const internalSearch =
      await search.search(compiled, {
        registryId,
        text: "Zephyr",
        visibility: "public",
      });
    const publicSearch =
      await search.search(compiled, {
        registryId,
        text: "Zephyr",
        visibility: "public",
        projection: "public",
      });

    assert.equal(internalSearch.total, 1);
    assert.equal(publicSearch.total, 0);

    const superseded =
      await lifecycle.requestTransition({
        registryId,
        recordId: corrected.id,
        toStatusId: "superseded",
        context: {
          actorId: "publisher-2",
          roles: ["publisher"],
          reason:
            "Replaced by a newer reviewed registry record.",
        },
        now:
          "2026-10-07T20:50:00.000Z",
      });

    assert.equal(
      superseded.kind,
      "executed",
    );
    assert.equal(
      superseded.record.status,
      "superseded",
    );
    assert.equal(
      compiled.publicationLifecycle?.isPublicStatus(
        "superseded",
      ),
      true,
    );

    await disclosure.setRecordDisclosure({
      registryId,
      recordId: corrected.id,
      disposition: "withheld",
      reason:
        "Temporary whole-record disclosure review",
      authority:
        "Example public-records exemption",
      publicNote:
        "Record retained as a public placeholder while review is pending.",
      updatedAt:
        "2026-10-07T20:55:00.000Z",
      actorId: "disclosure-reviewer",
    });

    const withheldBundle =
      await disclosure.getRecordBundle(
        registryId,
        corrected.id,
      );
    const current = await records.get(
      registryId,
      corrected.id,
    );
    assert.ok(current);

    const placeholder =
      projectRecordForPublic(
        current,
        compiled,
        withheldBundle.record ?? null,
        withheldBundle.fields,
      );

    assert.ok(placeholder.record);
    assert.equal(
      placeholder.record.fields.name,
      "Surveillance registry record withheld",
    );
    assert.equal(
      placeholder.record.fields
        .public_summary,
      "Public contents of this registry record are withheld.",
    );
    assert.deepEqual(
      placeholder.record.tags,
      [],
    );
    assert.deepEqual(
      placeholder.record
        .externalIdentifiers,
      [],
    );
  } finally {
    await pool.end();
  }
});
