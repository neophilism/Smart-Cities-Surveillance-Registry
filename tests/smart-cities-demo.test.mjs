import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  loadRegistryConfig,
} from "../packages/config/src/index.ts";
import {
  validateRegistryRecord,
} from "../packages/core/src/index.ts";
import {
  evaluateSmartCitiesEvidenceCoverage,
} from "../apps/web/lib/smart-cities-evidence.ts";
import {
  scanSmartCitiesPublicPayload,
  scanSmartCitiesPublicRecord,
} from "../apps/web/lib/smart-cities-public-safety.ts";

const config = loadRegistryConfig(
  await readFile(
    "config/registry.yaml",
    "utf8",
  ),
  {
    sourceName: "config/registry.yaml",
  },
);
const seed = JSON.parse(
  await readFile(
    "examples/smart-cities-demo/seed.json",
    "utf8",
  ),
);

test("demo dataset covers every canonical Smart Cities record type", () => {
  const actual = new Set(
    seed.records.map(
      (record) => record.recordTypeId,
    ),
  );
  const expected = new Set(
    config.definition.registry.recordTypes.map(
      (recordType) => recordType.id,
    ),
  );

  assert.deepEqual(actual, expected);
  assert.ok(seed.records.length >= 15);
});

test("demo dataset exercises every Smart Cities relationship type", () => {
  const actual = new Set(
    seed.relationships.map(
      (relationship) =>
        relationship.relationshipTypeId,
    ),
  );
  const expected = new Set(
    config.definition.registry.relationshipTypes.map(
      (relationshipType) =>
        relationshipType.id,
    ),
  );

  assert.deepEqual(actual, expected);
});

test("every demo record validates and passes the public-safety boundary", () => {
  for (const record of seed.records) {
    assert.deepEqual(
      validateRegistryRecord(
        record,
        config.definition.registry,
      ),
      [],
      record.id,
    );
    assert.deepEqual(
      scanSmartCitiesPublicRecord(record),
      [],
      record.id,
    );
  }
});

test("demo sources and documents use reserved synthetic domains and safe metadata", () => {
  for (const source of seed.sources) {
    const url = new URL(
      source.canonicalUrl,
    );

    assert.match(
      url.hostname,
      /\.example$/,
      source.id,
    );
    assert.deepEqual(
      scanSmartCitiesPublicPayload(
        source,
        `source.${source.id}`,
      ),
      [],
      source.id,
    );
  }

  for (const document of seed.documents) {
    const url = new URL(
      document.canonicalUrl,
    );

    assert.match(
      url.hostname,
      /\.example$/,
      document.id,
    );
    assert.match(
      document.sha256,
      /^[a-f0-9]{64}$/,
    );
    assert.deepEqual(
      scanSmartCitiesPublicPayload(
        document,
        `document.${document.id}`,
      ),
      [],
      document.id,
    );
  }
});

test("demo citations reference existing records, documents, and valid fields", () => {
  const recordsById = new Map(
    seed.records.map(
      (record) => [record.id, record],
    ),
  );
  const documentsById = new Map(
    seed.documents.map(
      (document) => [
        document.id,
        document,
      ],
    ),
  );

  for (const citation of seed.citations) {
    const record = recordsById.get(
      citation.recordId,
    );

    assert.ok(
      record,
      citation.id,
    );
    assert.ok(
      documentsById.has(
        citation.documentId,
      ),
      citation.id,
    );

    if (citation.fieldId) {
      assert.ok(
        Object.hasOwn(
          record.fields,
          citation.fieldId,
        ),
        `${citation.id} cites unpopulated field ${citation.fieldId}`,
      );
    }

    assert.deepEqual(
      scanSmartCitiesPublicPayload(
        citation,
        `citation.${citation.id}`,
      ),
      [],
      citation.id,
    );
  }
});

test("downtown deployment reaches complete public evidence coverage", () => {
  const record = seed.records.find(
    (candidate) =>
      candidate.id ===
      "demo-deployment-downtown",
  );
  assert.ok(record);

  const sourcesById = new Map(
    seed.sources.map(
      (source) => [source.id, source],
    ),
  );
  const documentsById = new Map(
    seed.documents.map(
      (document) => [
        document.id,
        document,
      ],
    ),
  );
  const evidence = seed.citations
    .filter(
      (citation) =>
        citation.recordId === record.id,
    )
    .map((citation) => {
      const document =
        documentsById.get(
          citation.documentId,
        );
      assert.ok(document);

      return {
        citation,
        document,
        source:
          document.sourceId
            ? sourcesById.get(
                document.sourceId,
              )
            : undefined,
      };
    });

  const coverage =
    evaluateSmartCitiesEvidenceCoverage(
      record,
      evidence,
    );

  assert.equal(coverage.complete, true);
  assert.deepEqual(
    coverage.missingCriticalFieldIds,
    [],
  );
});

test("demo deadline fields exercise every configured accountability clock", () => {
  const exercised = new Set();

  for (const definition of
    config.deadlines.definition.definitions) {
    for (const record of seed.records) {
      if (
        !definition.recordTypeIds.includes(
          record.recordTypeId,
        )
      ) {
        continue;
      }

      const anchor =
        definition.anchor;

      if (
        anchor.kind === "field" &&
        record.fields[
          anchor.fieldId
        ] !== undefined
      ) {
        exercised.add(definition.id);
      }
    }
  }

  assert.deepEqual(
    exercised,
    new Set(
      config.deadlines.definition.definitions.map(
        (definition) =>
          definition.id,
      ),
    ),
  );
});
