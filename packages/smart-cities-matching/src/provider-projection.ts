import type { SourceAdapterRow } from "@civic-registry/source-adapters";
import {
  proposeRelationshipsForIngestedRow,
  type IngestionRelationshipResult,
  type OfficialRelationshipResolver,
} from "./integration.ts";
import type { OfficialReferenceFieldMapping } from "./mapping.ts";

export interface ProviderRelationshipProfile {
  /** Profile settings are explicitly approved by a human before any provider run. */
  adapterId: string;
  mappings: readonly OfficialReferenceFieldMapping[];
}
export interface PersistedSourceRecord {
  registryId: string;
  recordId: string;
  sourceRow: SourceAdapterRow;
}
export interface ProviderProjectionResult {
  status: "processed" | "skipped";
  reason?: string;
  relationships?: IngestionRelationshipResult;
}
/**
 * Call after successful draft-first ingestion, never on a source row which was
 * rejected or for which the persisted record ID is unknown.
 */
export async function projectProviderRelationships(
  resolver: OfficialRelationshipResolver,
  profile: ProviderRelationshipProfile,
  record: PersistedSourceRecord,
): Promise<ProviderProjectionResult> {
  if (!profile.adapterId.trim() || profile.adapterId !== record.sourceRow.source_adapter) {
    return { status: "skipped", reason: "Provider profile does not match source adapter." };
  }
  if (!record.registryId.trim() || !record.recordId.trim() || !record.sourceRow.external_id?.trim()) {
    return { status: "skipped", reason: "Missing persisted record or source identity." };
  }
  if (profile.mappings.length === 0) {
    return { status: "skipped", reason: "No explicitly approved relationship mappings." };
  }
  // Preserve only the approved mapped fields; never guess an identifier from
  // a title, vendor name, or other non-mapped provider attribute.
  const values: Record<string, unknown> = {};
  for (const mapping of profile.mappings) {
    values[mapping.sourceField] = record.sourceRow[mapping.sourceField];
  }
  return {
    status: "processed",
    relationships: await proposeRelationshipsForIngestedRow(resolver, {
      registryId: record.registryId,
      fromRecordId: record.recordId,
      row: {
        externalId: record.sourceRow.external_id,
        sourceUrl: record.sourceRow.canonical_url,
        values,
      },
      mappings: profile.mappings,
    }),
  };
}
