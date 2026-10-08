import assert from "node:assert/strict";
import test from "node:test";

import {
  parseRegistryConfig,
} from "../packages/config/src/index.ts";
import {
  createDatabasePool,
  PostgresDisclosureRepository,
  PostgresDocumentRepository,
  PostgresRecordRepository,
  PostgresRegistryConfigRepository,
  PostgresSourceRepository,
  runMigrations,
} from "../packages/database/src/index.ts";
import {
  SmartCitiesDocumentIngestionService,
  searchSmartCitiesDocumentText,
} from "../packages/smart-cities-documents/src/index.ts";
import {
  createTextPdf,
} from "./helpers/pdf-fixture.mjs";
import { readFile } from "node:fs/promises";

const databaseUrl =
  process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required for Smart Cities document integration tests.",
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
const now =
  "2026-10-08T04:15:00.000Z";

function adapterRow() {
  return {
    id: "adapter-doc-100",
    external_id: "DOC-100",
    title:
      "Example Surveillance Oversight Report",
    canonical_url:
      "https://catalog.example.gov/records/DOC-100",
    source_adapter:
      "example-html-catalog",
    retrieved_at: now,
    attachment_urls: [
      "https://docs.example.gov/reports/DOC-100.pdf",
    ],
  };
}

async function setup() {
  const pool = createDatabasePool({
    connectionString: databaseUrl,
    applicationName:
      "smart-cities-document-tests",
  });

  await runMigrations(pool);
  await pool.query(
    "TRUNCATE civic_registry_configurations CASCADE",
  );

  const configs =
    new PostgresRegistryConfigRepository(
      pool,
    );
  await configs.upsert(config);

  const records =
    new PostgresRecordRepository(
      pool,
      configs,
    );

  await records.create(
    {
      id: "document-linked-deployment",
      registryId,
      recordTypeId: "deployment",
      fields: {
        name:
          "Example Document-Linked Deployment",
        jurisdiction:
          "Example City",
        deployment_status:
          "active",
        public_summary:
          "Synthetic record for official document ingestion testing.",
        public_location_scope:
          "Civic center district",
      },
      status: "published",
      visibility: "public",
      externalIdentifiers: [
        {
          scheme:
            "official-record",
          value: "DOC-100",
        },
      ],
      tags: ["synthetic"],
      createdAt: now,
      updatedAt: now,
      publishedAt: now,
    },
    {
      bootstrapLifecycle: true,
    },
  );

  let currentPdf =
    createTextPdf(
      "Retention oversight report. The public retention schedule is thirty days.",
    );
  const client = {
    async fetchBytes(url) {
      return {
        requestedUrl: url,
        finalUrl: url,
        contentType:
          "application/pdf",
        fetchedAt: now,
        body: currentPdf,
      };
    },
    async fetchText() {
      throw new Error(
        "unexpected fetchText",
      );
    },
    async fetchJson() {
      throw new Error(
        "unexpected fetchJson",
      );
    },
  };
  const storage = {
    async put(input) {
      return {
        storageKey:
          "sha256/" +
          input.sha256.slice(
            0,
            2,
          ) +
          "/" +
          input.sha256 +
          "." +
          input.extension,
        byteLength:
          input.data.byteLength,
      };
    },
  };
  const service =
    new SmartCitiesDocumentIngestionService(
      pool,
      storage,
      {
        client,
      },
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

  return {
    pool,
    service,
    disclosure,
    setPdf(bytes) {
      currentPdf = bytes;
    },
  };
}

test("adapter attachments become hashed documents, page extractions, and record citations", async () => {
  const {
    pool,
    service,
  } = await setup();

  try {
    const result =
      await service.ingestAdapterRows({
        registryId,
        rows: [adapterRow()],
        allowedHosts: [
          "docs.example.gov",
        ],
        retrievedAt: now,
      });

    assert.equal(
      result.matchedRecords,
      1,
    );
    assert.equal(
      result.attachmentCreated,
      1,
    );
    assert.equal(
      result.attachmentFailed,
      0,
    );

    const attachment =
      result.rows[0]
        .attachments[0];

    assert.equal(
      attachment.status,
      "created",
    );
    assert.match(
      attachment.sha256,
      /^[a-f0-9]{64}$/,
    );
    assert.equal(
      attachment.pageCount,
      1,
    );
    assert.match(
      attachment.text,
      /retention schedule/i,
    );
    assert.match(
      attachment.storageKey,
      /^sha256\/[a-f0-9]{2}\/[a-f0-9]{64}\.pdf$/,
    );

    const matches =
      await searchSmartCitiesDocumentText(
        pool,
        {
          registryId,
          query:
            "retention schedule",
        },
      );

    assert.equal(
      matches.length,
      1,
    );
    assert.equal(
      matches[0].recordId,
      "document-linked-deployment",
    );
    assert.deepEqual(
      matches[0].matchedPages,
      [1],
    );
    assert.equal(
      matches[0].documentId,
      attachment.documentId,
    );
    assert.equal(
      matches[0].documentUrl,
      "https://docs.example.gov/reports/DOC-100.pdf",
    );
  } finally {
    await pool.end();
  }
});

test("changed bytes at one official URL create immutable document versions while identical repeats are idempotent", async () => {
  const {
    pool,
    service,
    setPdf,
  } = await setup();

  try {
    const first =
      await service.ingestAdapterRows({
        registryId,
        rows: [adapterRow()],
        allowedHosts: [
          "docs.example.gov",
        ],
        retrievedAt: now,
      });
    const firstDocumentId =
      first.rows[0]
        .attachments[0]
        .documentId;

    setPdf(
      createTextPdf(
        "Updated oversight report. The remediation review is complete.",
      ),
    );

    const second =
      await service.ingestAdapterRows({
        registryId,
        rows: [adapterRow()],
        allowedHosts: [
          "docs.example.gov",
        ],
        retrievedAt:
          "2026-10-09T04:15:00.000Z",
      });
    const secondDocumentId =
      second.rows[0]
        .attachments[0]
        .documentId;

    assert.equal(
      second.attachmentCreated,
      1,
    );
    assert.notEqual(
      secondDocumentId,
      firstDocumentId,
    );

    const third =
      await service.ingestAdapterRows({
        registryId,
        rows: [adapterRow()],
        allowedHosts: [
          "docs.example.gov",
        ],
        retrievedAt:
          "2026-10-10T04:15:00.000Z",
      });

    assert.equal(
      third.attachmentExisting,
      1,
    );

    const counts =
      await pool.query(
        `SELECT
           (SELECT COUNT(*)::int
            FROM civic_registry_documents
            WHERE registry_id = $1)
             AS documents,
           (SELECT COUNT(*)::int
            FROM civic_registry_citations
            WHERE registry_id = $1)
             AS citations,
           (SELECT COUNT(*)::int
            FROM civic_registry_document_extractions
            WHERE registry_id = $1)
             AS extractions`,
        [registryId],
      );

    assert.deepEqual(
      counts.rows[0],
      {
        documents: 2,
        citations: 2,
        extractions: 2,
      },
    );

    assert.equal(
      (
        await searchSmartCitiesDocumentText(
          pool,
          {
            registryId,
            query: "retention",
          },
        )
      ).length,
      1,
    );
    assert.equal(
      (
        await searchSmartCitiesDocumentText(
          pool,
          {
            registryId,
            query: "remediation",
          },
        )
      ).length,
      1,
    );
  } finally {
    await pool.end();
  }
});

test("public extracted-text search excludes documents with public redactions", async () => {
  const {
    pool,
    service,
    disclosure,
  } = await setup();

  try {
    const result =
      await service.ingestAdapterRows({
        registryId,
        rows: [adapterRow()],
        allowedHosts: [
          "docs.example.gov",
        ],
      });
    const documentId =
      result.rows[0]
        .attachments[0]
        .documentId;

    assert.ok(documentId);

    await disclosure.upsertDocumentRedaction({
      id: "redaction-1",
      registryId,
      documentId,
      locator: {
        page: 1,
      },
      replacementText:
        "[REDACTED]",
      reason:
        "Synthetic public-safety redaction.",
      createdAt: now,
      actorId:
        "disclosure-reviewer",
    });

    const matches =
      await searchSmartCitiesDocumentText(
        pool,
        {
          registryId,
          query: "retention",
        },
      );

    assert.deepEqual(
      matches,
      [],
    );
  } finally {
    await pool.end();
  }
});

test("adapter rows without a unique registry match are reported without fetching attachments", async () => {
  const {
    pool,
    service,
  } = await setup();

  try {
    const row = adapterRow();
    row.external_id =
      "MISSING-RECORD";

    const result =
      await service.ingestAdapterRows({
        registryId,
        rows: [row],
        allowedHosts: [
          "docs.example.gov",
        ],
      });

    assert.equal(
      result.matchedRecords,
      0,
    );
    assert.equal(
      result.rows[0].status,
      "record_not_found",
    );
    assert.equal(
      result.attachmentCreated,
      0,
    );
  } finally {
    await pool.end();
  }
});
