import type { OfficialRelationshipReference, ReferenceResolution } from "./index.ts";
import { mapOfficialSourceReferences, type OfficialSourceReferenceInput } from "./mapping.ts";

export interface OfficialRelationshipResolver {
  resolve(reference: OfficialRelationshipReference): Promise<ReferenceResolution>;
}
export interface IngestionRelationshipResult {
  resolutions: ReferenceResolution[];
  warnings: string[];
  proposed: number;
  existing: number;
  unmatched: number;
  ambiguous: number;
  invalid: number;
}
/**
 * Call ONLY after the source row has been ingested and its record ID is established.
 * Link proposals do not alter lifecycle status or grant publication rights.
 */
export async function proposeRelationshipsForIngestedRow(
  resolver: OfficialRelationshipResolver,
  input: OfficialSourceReferenceInput,
): Promise<IngestionRelationshipResult> {
  const mapped = mapOfficialSourceReferences(input);
  const resolutions: ReferenceResolution[] = [];
  for (const reference of mapped.references) resolutions.push(await resolver.resolve(reference));
  const count = (status: ReferenceResolution["status"]) =>
    resolutions.filter((result) => result.status === status).length;
  return {
    resolutions, warnings: mapped.warnings,
    proposed: count("proposed"), existing: count("existing"),
    unmatched: count("unmatched"), ambiguous: count("ambiguous"),
    invalid: count("invalid"),
  };
}
