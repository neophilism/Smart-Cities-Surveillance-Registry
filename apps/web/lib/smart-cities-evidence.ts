import type {
  RegistryRecord,
} from "@civic-registry/core";
import type {
  CitationEvidence,
} from "@civic-registry/database";

export interface SmartCitiesEvidenceRequirement {
  recordTypeId: string;
  criticalFieldIds: string[];
  description: string;
}

export interface SmartCitiesEvidenceCoverage {
  recordId: string;
  recordTypeId: string;
  hasRecordLevelEvidence: boolean;
  applicableCriticalFieldIds: string[];
  supportedCriticalFieldIds: string[];
  missingCriticalFieldIds: string[];
  publicCitationCount: number;
  complete: boolean;
}

export interface SmartCitiesProvenanceAssessment {
  citationId: string;
  hasCanonicalSourceUrl: boolean;
  hasRetrievalTimestamp: boolean;
  hasContentHashWhenDocumented: boolean;
  hasLocatorWhenDocumented: boolean;
  complete: boolean;
}

export const SMART_CITIES_EVIDENCE_REQUIREMENTS:
  Record<string, SmartCitiesEvidenceRequirement> = {
  deployment: {
    recordTypeId: "deployment",
    criticalFieldIds: [
      "deployment_status",
      "approved_purpose",
      "retention_days",
      "legal_process_requirement",
      "approved_on",
      "next_audit_due_on",
    ],
    description:
      "Deployment status, authority-sensitive operating facts, retention, legal process, approval, and oversight dates should be traceable to public primary sources.",
  },
  technology: {
    recordTypeId: "technology",
    criticalFieldIds: [
      "manufacturer",
      "model",
      "capability_categories",
      "data_categories",
      "real_time_capable",
      "biometric_capable",
      "automated_decision_support",
    ],
    description:
      "Material technical capabilities should be supported by official product, procurement, assessment, or agency documentation.",
  },
  agency: {
    recordTypeId: "agency",
    criticalFieldIds: [
      "jurisdiction",
      "agency_type",
    ],
    description:
      "Agency identity and jurisdiction should be traceable to an official public source.",
  },
  vendor: {
    recordTypeId: "vendor",
    criticalFieldIds: [
      "legal_name",
      "vendor_type",
    ],
    description:
      "Vendor identity should be traceable to official procurement, corporate, or agency records.",
  },
  policy: {
    recordTypeId: "policy",
    criticalFieldIds: [
      "policy_type",
      "citation_or_number",
      "policy_status",
      "adopted_on",
      "effective_on",
      "expires_on",
      "review_due_on",
    ],
    description:
      "Legal and policy status, identifiers, and dates should be supported by the authoritative text or official publication.",
  },
  authorization: {
    recordTypeId: "authorization",
    criticalFieldIds: [
      "authorization_type",
      "approving_body",
      "reference_number",
      "authorization_status",
      "approved_on",
      "effective_on",
      "expires_on",
    ],
    description:
      "Approval status, issuing body, reference number, conditions, and dates should be supported by the official authorization record.",
  },
  procurement: {
    recordTypeId: "procurement",
    criticalFieldIds: [
      "procurement_type",
      "procurement_status",
      "reference_number",
      "amount",
      "awarded_on",
      "starts_on",
      "ends_on",
      "renewal_due_on",
    ],
    description:
      "Contract identity, value, status, and dates should be supported by official procurement records.",
  },
  audit: {
    recordTypeId: "audit",
    criticalFieldIds: [
      "assessment_type",
      "assessor",
      "completed_on",
      "overall_status",
      "summary",
      "next_review_due_on",
    ],
    description:
      "Assessment scope, findings, status, and follow-up dates should be traceable to the published assessment or audit.",
  },
  violation: {
    recordTypeId: "violation",
    criticalFieldIds: [
      "incident_type",
      "incident_status",
      "severity",
      "occurred_on",
      "reported_on",
      "remediation_due_on",
      "resolved_on",
    ],
    description:
      "Incident status and remediation claims should be supported by an official finding, notice, report, or equivalent primary source.",
  },
  data_sharing: {
    recordTypeId: "data_sharing",
    criticalFieldIds: [
      "sharing_type",
      "recipient_category",
      "data_categories",
      "legal_basis",
      "access_conditions",
      "retention_rules",
      "arrangement_status",
      "effective_on",
      "expires_on",
    ],
    description:
      "Sharing scope, legal basis, conditions, retention rules, and dates should be traceable to the governing agreement or policy.",
  },
};

function hasMeaningfulValue(value: unknown): boolean {
  if (value === undefined || value === null) return false;

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  if (Array.isArray(value)) {
    return value.length > 0;
  }

  return true;
}

export function evaluateSmartCitiesEvidenceCoverage(
  record: RegistryRecord,
  evidence: CitationEvidence[],
): SmartCitiesEvidenceCoverage {
  const requirement =
    SMART_CITIES_EVIDENCE_REQUIREMENTS[
      record.recordTypeId
    ];

  if (!requirement) {
    throw new Error(
      `No Smart Cities evidence policy is configured for record type ${record.recordTypeId}.`,
    );
  }

  const publicEvidence = evidence.filter(
    (item) =>
      item.citation.visibility === "public",
  );
  const supportedFields = new Set(
    publicEvidence.flatMap((item) =>
      item.citation.fieldId
        ? [item.citation.fieldId]
        : [],
    ),
  );
  const applicableCriticalFieldIds =
    requirement.criticalFieldIds.filter(
      (fieldId) =>
        hasMeaningfulValue(
          record.fields[fieldId],
        ),
    );
  const supportedCriticalFieldIds =
    applicableCriticalFieldIds.filter(
      (fieldId) =>
        supportedFields.has(fieldId),
    );
  const missingCriticalFieldIds =
    applicableCriticalFieldIds.filter(
      (fieldId) =>
        !supportedFields.has(fieldId),
    );
  const hasRecordLevelEvidence =
    publicEvidence.some(
      (item) =>
        item.citation.fieldId === undefined,
    );

  return {
    recordId: record.id,
    recordTypeId: record.recordTypeId,
    hasRecordLevelEvidence,
    applicableCriticalFieldIds,
    supportedCriticalFieldIds,
    missingCriticalFieldIds,
    publicCitationCount:
      publicEvidence.length,
    complete:
      hasRecordLevelEvidence &&
      missingCriticalFieldIds.length === 0,
  };
}

export function assessSmartCitiesProvenance(
  evidence: CitationEvidence,
): SmartCitiesProvenanceAssessment {
  const citation = evidence.citation;
  const source = evidence.source;
  const document = evidence.document;
  const hasCanonicalSourceUrl =
    Boolean(
      source?.canonicalUrl ??
        document?.canonicalUrl,
    );
  const hasRetrievalTimestamp =
    Boolean(source?.retrievedAt);
  const hasContentHashWhenDocumented =
    !document || Boolean(document.sha256);
  const hasLocatorWhenDocumented =
    !document ||
    Boolean(
      citation.locator &&
        (
          citation.locator.page !== undefined ||
          citation.locator.section ||
          citation.locator.paragraph ||
          citation.locator.lineStart !== undefined ||
          citation.locator.fragment
        ),
    );

  return {
    citationId: citation.id,
    hasCanonicalSourceUrl,
    hasRetrievalTimestamp,
    hasContentHashWhenDocumented,
    hasLocatorWhenDocumented,
    complete:
      hasCanonicalSourceUrl &&
      hasRetrievalTimestamp &&
      hasContentHashWhenDocumented &&
      hasLocatorWhenDocumented,
  };
}
