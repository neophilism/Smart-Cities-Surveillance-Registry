import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  parseRegistryConfig,
} from "../packages/config/src/index.ts";
import {
  createDatabasePool,
  PostgresCitationRepository,
  PostgresDocumentRepository,
  PostgresRecordRepository,
  PostgresRegistryConfigRepository,
  PostgresSourceRepository,
  runMigrations,
} from "../packages/database/src/index.ts";
import {
  assessSmartCitiesProvenance,
  evaluateSmartCitiesEvidenceCoverage,
} from "../apps/web/lib/smart-cities-evidence.ts";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required for Smart Cities evidence integration tests.",
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
const now = "2026-10-08T01:00:00.000Z";

async function setup() {
  const pool = createDatabasePool({
    connectionString: databaseUrl,
    applicationName:
      "smart-cities-primary-source-evidence-tests",
  });

  await runMigrations(pool);
  await pool.query(
    "TRUNCATE civic_registry_configurations CASCADE",
  );

  const configs =
    new PostgresRegistryConfigRepository(pool);
  const records =
    new PostgresRecordRepository(pool, configs);
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
  const citations =
    new PostgresCitationRepository(
      pool,
      configs,
      records,
      sources,
      documents,
    );

  await configs.upsert(config);

  return {
    pool,
    records,
    sources,
    documents,
    citations,
  };
}

test("Smart Cities primary-source evidence resolves official provenance and field-level citations", async () => {
  const {
    pool,
    records,
    sources,
    documents,
    citations,
  } = await setup();

  try {
    const record = await records.create(
      {
        id: "deployment-primary-source",
        registryId,
        recordTypeId: "deployment",
        fields: {
          name:
            "Example downtown surveillance deployment",
          jurisdiction: "Example City",
          jurisdiction_type: "city",
          deployment_status: "active",
          public_summary:
            "Synthetic deployment used for evidence testing.",
          approved_purpose:
            "Traffic safety and incident response.",
          retention_days: 30,
          legal_process_requirement:
            "policy_authorization",
          approved_on: "2026-01-15",
          next_audit_due_on:
            "2027-01-15",
        },
        status: "published",
        visibility: "public",
        externalIdentifiers: [],
        tags: ["synthetic"],
        createdAt: now,
        updatedAt: now,
        publishedAt: now,
      },
      {
        bootstrapLifecycle: true,
        context: {
          actorId:
            "system:evidence-fixture",
          reason:
            "Create synthetic published evidence fixture.",
        },
      },
    );

    const source = await sources.create({
      id: "example-council-source",
      registryId,
      title:
        "Example City Council surveillance authorization",
      sourceType: "webpage",
      visibility: "public",
      canonicalUrl:
        "https://example.gov/council/surveillance-authorization",
      publishedAt:
        "2026-01-15T17:00:00.000Z",
      retrievedAt:
        "2026-10-08T00:55:00.000Z",
      description:
        "Synthetic official publication page representing the authoritative council action and attached policy document.",
      createdAt: now,
    });

    const document = await documents.create({
      id: "example-council-authorization-pdf",
      registryId,
      title:
        "Example City Council Surveillance Authorization PDF",
      visibility: "public",
      sourceId: source.id,
      fileName:
        "surveillance-authorization.pdf",
      mimeType: "application/pdf",
      storageKey:
        "sha256/ab/abababababababababababababababababababababababababababababababab",
      canonicalUrl:
        "https://example.gov/council/surveillance-authorization.pdf",
      sha256:
        "abababababababababababababababababababababababababababababababab",
      pageCount: 18,
      language: "en",
      createdAt: now,
    });

    const citationsToCreate = [
      {
        id: "deployment-record-evidence",
        note:
          "Council authorization and attached policy establish the deployment record.",
        locator: {
          page: 1,
          section: "Authorization",
        },
      },
      {
        id: "deployment-status-evidence",
        fieldId: "deployment_status",
        locator: {
          page: 2,
          section: "Program status",
        },
      },
      {
        id: "deployment-purpose-evidence",
        fieldId: "approved_purpose",
        locator: {
          page: 4,
          section: "Authorized purposes",
        },
      },
      {
        id: "deployment-retention-evidence",
        fieldId: "retention_days",
        locator: {
          page: 9,
          section: "Retention",
        },
      },
      {
        id: "deployment-process-evidence",
        fieldId:
          "legal_process_requirement",
        locator: {
          page: 11,
          section: "Access and legal process",
        },
      },
      {
        id: "deployment-approved-on-evidence",
        fieldId: "approved_on",
        locator: {
          page: 1,
          section: "Approval date",
        },
      },
      {
        id: "deployment-audit-due-evidence",
        fieldId: "next_audit_due_on",
        locator: {
          page: 15,
          section: "Oversight schedule",
        },
      },
    ];

    for (const item of citationsToCreate) {
      await citations.create({
        ...item,
        registryId,
        recordId: record.id,
        documentId: document.id,
        visibility: "public",
        createdAt: now,
      });
    }

    const evidence =
      await citations.listEvidenceForRecord(
        registryId,
        record.id,
        {
          visibility: "public",
        },
      );

    assert.equal(
      evidence.length,
      citationsToCreate.length,
    );

    for (const item of evidence) {
      assert.equal(
        item.source?.id,
        source.id,
      );
      assert.equal(
        item.document?.id,
        document.id,
      );
      assert.equal(
        item.source?.canonicalUrl,
        "https://example.gov/council/surveillance-authorization",
      );
      assert.equal(
        item.source?.retrievedAt,
        "2026-10-08T00:55:00.000Z",
      );
      assert.equal(
        item.document?.sha256,
        "abababababababababababababababababababababababababababababababab",
      );
      assert.equal(
        assessSmartCitiesProvenance(
          item,
        ).complete,
        true,
      );
    }

    const coverage =
      evaluateSmartCitiesEvidenceCoverage(
        record,
        evidence,
      );

    assert.equal(
      coverage.hasRecordLevelEvidence,
      true,
    );
    assert.deepEqual(
      coverage.missingCriticalFieldIds,
      [],
    );
    assert.equal(coverage.complete, true);
  } finally {
    await pool.end();
  }
});

test("evidence coverage exposes unsupported public claims instead of treating a document as blanket proof", async () => {
  const {
    pool,
    records,
    sources,
    documents,
    citations,
  } = await setup();

  try {
    const record = await records.create(
      {
        id: "procurement-evidence-gap",
        registryId,
        recordTypeId: "procurement",
        fields: {
          title:
            "Example surveillance technology contract",
          procurement_type: "contract",
          procurement_status: "active",
          reference_number:
            "EXAMPLE-2026-17",
          amount: 250000,
          awarded_on: "2026-02-01",
          starts_on: "2026-03-01",
          ends_on: "2027-02-28",
          renewal_due_on:
            "2026-12-15",
        },
        status: "published",
        visibility: "public",
        externalIdentifiers: [],
        tags: ["synthetic"],
        createdAt: now,
        updatedAt: now,
        publishedAt: now,
      },
      {
        bootstrapLifecycle: true,
      },
    );

    const source = await sources.create({
      id: "procurement-source",
      registryId,
      title:
        "Example City procurement portal",
      sourceType: "webpage",
      visibility: "public",
      canonicalUrl:
        "https://example.gov/procurement/EXAMPLE-2026-17",
      retrievedAt: now,
      createdAt: now,
    });

    const document = await documents.create({
      id: "procurement-contract",
      registryId,
      title:
        "Example surveillance contract",
      visibility: "public",
      sourceId: source.id,
      canonicalUrl:
        "https://example.gov/procurement/EXAMPLE-2026-17/contract.pdf",
      sha256:
        "cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd",
      pageCount: 40,
      language: "en",
      createdAt: now,
    });

    await citations.create({
      id: "procurement-record-evidence",
      registryId,
      recordId: record.id,
      documentId: document.id,
      locator: {
        page: 1,
      },
      visibility: "public",
      createdAt: now,
    });

    await citations.create({
      id: "procurement-amount-evidence",
      registryId,
      recordId: record.id,
      fieldId: "amount",
      documentId: document.id,
      locator: {
        page: 7,
        section: "Contract value",
      },
      visibility: "public",
      createdAt: now,
    });

    const evidence =
      await citations.listEvidenceForRecord(
        registryId,
        record.id,
        {
          visibility: "public",
        },
      );
    const coverage =
      evaluateSmartCitiesEvidenceCoverage(
        record,
        evidence,
      );

    assert.equal(
      coverage.hasRecordLevelEvidence,
      true,
    );
    assert.equal(coverage.complete, false);
    assert.ok(
      coverage.supportedCriticalFieldIds.includes(
        "amount",
      ),
    );
    assert.ok(
      coverage.missingCriticalFieldIds.includes(
        "ends_on",
      ),
    );
    assert.ok(
      coverage.missingCriticalFieldIds.includes(
        "procurement_status",
      ),
    );
    assert.ok(
      coverage.missingCriticalFieldIds.includes(
        "renewal_due_on",
      ),
    );
  } finally {
    await pool.end();
  }
});
