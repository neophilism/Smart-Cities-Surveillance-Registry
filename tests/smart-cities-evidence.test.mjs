import assert from "node:assert/strict";
import test from "node:test";

import {
  assessSmartCitiesProvenance,
  evaluateSmartCitiesEvidenceCoverage,
  SMART_CITIES_EVIDENCE_REQUIREMENTS,
} from "../apps/web/lib/smart-cities-evidence.ts";

const registryId =
  "smart-cities-surveillance-registry";
const now = "2026-10-08T00:40:00.000Z";

function deployment() {
  return {
    id: "deployment-evidence",
    registryId,
    recordTypeId: "deployment",
    fields: {
      name: "Example evidence deployment",
      jurisdiction: "Example City",
      deployment_status: "active",
      public_summary: "Synthetic.",
      approved_purpose: "Public safety",
      retention_days: 30,
      legal_process_requirement:
        "policy_authorization",
      approved_on: "2026-01-15",
      next_audit_due_on: "2027-01-15",
    },
    status: "published",
    visibility: "public",
    externalIdentifiers: [],
    tags: ["synthetic"],
    createdAt: now,
    updatedAt: now,
    publishedAt: now,
  };
}

function evidence(
  id,
  fieldId,
  options = {},
) {
  const document =
    options.document === false
      ? undefined
      : {
          id: "document-" + id,
          registryId,
          title: "Evidence document",
          visibility: "public",
          sourceId: "source-1",
          canonicalUrl:
            "https://example.gov/evidence.pdf",
          sha256:
            "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          pageCount: 10,
          language: "en",
          createdAt: now,
        };

  return {
    citation: {
      id,
      registryId,
      recordId: "deployment-evidence",
      fieldId,
      sourceId: "source-1",
      documentId: document?.id,
      locator: document
        ? {
            page: 2,
            section: "Program terms",
          }
        : undefined,
      visibility: "public",
      createdAt: now,
    },
    source: {
      id: "source-1",
      registryId,
      title: "Official program page",
      sourceType: "webpage",
      visibility: "public",
      canonicalUrl:
        "https://example.gov/program",
      retrievedAt: now,
      createdAt: now,
    },
    document,
  };
}

test("evidence policy covers every Smart Cities record type", () => {
  assert.deepEqual(
    Object.keys(
      SMART_CITIES_EVIDENCE_REQUIREMENTS,
    ).sort(),
    [
      "agency",
      "audit",
      "authorization",
      "data_sharing",
      "deployment",
      "policy",
      "procurement",
      "technology",
      "vendor",
      "violation",
    ],
  );

  for (const requirement of Object.values(
    SMART_CITIES_EVIDENCE_REQUIREMENTS,
  )) {
    assert.ok(
      requirement.criticalFieldIds.length > 0,
      `${requirement.recordTypeId} must identify critical evidence fields`,
    );
    assert.ok(
      requirement.description.length > 20,
    );
  }
});

test("coverage requires record-level evidence plus citations for populated critical fields", () => {
  const record = deployment();
  const evidenceSet = [
    evidence("record-level"),
    evidence(
      "status",
      "deployment_status",
    ),
    evidence(
      "retention",
      "retention_days",
    ),
    evidence(
      "legal-process",
      "legal_process_requirement",
    ),
  ];

  const incomplete =
    evaluateSmartCitiesEvidenceCoverage(
      record,
      evidenceSet,
    );

  assert.equal(
    incomplete.hasRecordLevelEvidence,
    true,
  );
  assert.deepEqual(
    incomplete.missingCriticalFieldIds.sort(),
    [
      "approved_on",
      "approved_purpose",
      "next_audit_due_on",
    ],
  );
  assert.equal(incomplete.complete, false);

  const complete =
    evaluateSmartCitiesEvidenceCoverage(
      record,
      [
        ...evidenceSet,
        evidence(
          "purpose",
          "approved_purpose",
        ),
        evidence(
          "approved-on",
          "approved_on",
        ),
        evidence(
          "audit-due",
          "next_audit_due_on",
        ),
      ],
    );

  assert.deepEqual(
    complete.missingCriticalFieldIds,
    [],
  );
  assert.equal(complete.complete, true);
});

test("unpopulated critical fields do not manufacture evidence gaps", () => {
  const record = deployment();
  delete record.fields.approved_on;
  delete record.fields.next_audit_due_on;

  const result =
    evaluateSmartCitiesEvidenceCoverage(
      record,
      [
        evidence("record-level"),
        evidence(
          "status",
          "deployment_status",
        ),
        evidence(
          "purpose",
          "approved_purpose",
        ),
        evidence(
          "retention",
          "retention_days",
        ),
        evidence(
          "legal-process",
          "legal_process_requirement",
        ),
      ],
    );

  assert.deepEqual(
    result.applicableCriticalFieldIds.sort(),
    [
      "approved_purpose",
      "deployment_status",
      "legal_process_requirement",
      "retention_days",
    ],
  );
  assert.equal(result.complete, true);
});

test("private citations do not count toward public evidence coverage", () => {
  const record = deployment();
  const privateStatus =
    evidence(
      "private-status",
      "deployment_status",
    );
  privateStatus.citation.visibility =
    "private";

  const result =
    evaluateSmartCitiesEvidenceCoverage(
      record,
      [
        evidence("record-level"),
        privateStatus,
      ],
    );

  assert.ok(
    result.missingCriticalFieldIds.includes(
      "deployment_status",
    ),
  );
});

test("provenance assessment expects source URL, retrieval time, document hash, and locator", () => {
  const complete =
    assessSmartCitiesProvenance(
      evidence(
        "complete",
        "retention_days",
      ),
    );

  assert.equal(
    complete.hasCanonicalSourceUrl,
    true,
  );
  assert.equal(
    complete.hasRetrievalTimestamp,
    true,
  );
  assert.equal(
    complete.hasContentHashWhenDocumented,
    true,
  );
  assert.equal(
    complete.hasLocatorWhenDocumented,
    true,
  );
  assert.equal(complete.complete, true);

  const weak = evidence(
    "weak",
    "retention_days",
  );
  delete weak.source.retrievedAt;
  delete weak.document.sha256;
  delete weak.citation.locator;

  const assessed =
    assessSmartCitiesProvenance(weak);

  assert.equal(
    assessed.hasRetrievalTimestamp,
    false,
  );
  assert.equal(
    assessed.hasContentHashWhenDocumented,
    false,
  );
  assert.equal(
    assessed.hasLocatorWhenDocumented,
    false,
  );
  assert.equal(assessed.complete, false);
});
