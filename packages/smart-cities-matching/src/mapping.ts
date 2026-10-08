import type { OfficialRelationshipReference } from "./index.ts";

export interface OfficialReferenceFieldMapping {
  sourceField: string;
  relationshipTypeId: string;
  targetRecordTypeId: string;
  targetIdentifierScheme: string;
}
export interface OfficialSourceRelationshipRow {
  externalId: string;
  sourceUrl: string;
  values: Record<string, unknown>;
}
export interface OfficialSourceReferenceInput {
  registryId: string;
  fromRecordId: string;
  row: OfficialSourceRelationshipRow;
  mappings: readonly OfficialReferenceFieldMapping[];
}
export interface MappingResult {
  references: OfficialRelationshipReference[];
  warnings: string[];
}
const valid = (s: string) => typeof s === "string" && s.trim().length > 0;
/** Explicit external identifiers only: never infer links from descriptive text. */
export function mapOfficialSourceReferences(input: OfficialSourceReferenceInput): MappingResult {
  const references: OfficialRelationshipReference[] = [];
  const warnings: string[] = [];
  if (![input.registryId, input.fromRecordId, input.row.externalId, input.row.sourceUrl].every(valid)) {
    return { references, warnings: ["Source record, registry, external ID, and source URL are required."] };
  }
  const seen = new Set<string>();
  for (const mapping of input.mappings) {
    if (![mapping.sourceField, mapping.relationshipTypeId, mapping.targetRecordTypeId, mapping.targetIdentifierScheme].every(valid)) {
      warnings.push("Invalid relationship field mapping.");
      continue;
    }
    const value = input.row.values[mapping.sourceField];
    // Never silently stringify objects, values with uncertain structure, or untrusted arrays.
    const values = typeof value === "string" ? [value] :
      Array.isArray(value) && value.every((item) => typeof item === "string") ? value as string[] : [];
    if (value !== undefined && values.length === 0) {
      warnings.push("Non-string external identifier ignored for field " + mapping.sourceField + ".");
    }
    for (const raw of values) {
      const identifier = raw.trim();
      if (!identifier) continue;
      const key = JSON.stringify([mapping.relationshipTypeId, mapping.targetRecordTypeId, mapping.targetIdentifierScheme, identifier]);
      if (seen.has(key)) continue;
      seen.add(key);
      references.push({
        registryId: input.registryId,
        fromRecordId: input.fromRecordId,
        relationshipTypeId: mapping.relationshipTypeId,
        targetRecordTypeId: mapping.targetRecordTypeId,
        targetIdentifierScheme: mapping.targetIdentifierScheme,
        targetExternalId: identifier,
        sourceUrl: input.row.sourceUrl,
        sourceKey: input.row.externalId,
        sourceField: mapping.sourceField,
      });
    }
  }
  return { references, warnings };
}
