import { createHash } from "node:crypto";
import type { Pool, QueryResultRow } from "pg";
import { PostgresRelationshipCandidateService } from "@civic-registry/database";

export interface OfficialRelationshipReference {
  registryId: string;
  fromRecordId: string;
  relationshipTypeId: string;
  targetRecordTypeId: string;
  targetIdentifierScheme: string;
  targetExternalId: string;
  sourceUrl: string;
  sourceKey: string;
  sourceField: string;
}
export interface ReferenceResolution {
  reference: OfficialRelationshipReference;
  status: "proposed" | "existing" | "unmatched" | "ambiguous" | "invalid";
  candidateId?: string;
  matchedRecordId?: string;
  reason?: string;
}
interface MatchedRow extends QueryResultRow { id: string; }
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export function candidateIdForReference(input: OfficialRelationshipReference, targetId: string): string {
  return "official-rel-" + digest(JSON.stringify([
    input.registryId, input.fromRecordId, input.relationshipTypeId,
    targetId, input.sourceUrl, input.sourceKey, input.sourceField,
  ])).slice(0, 32);
}
export class SmartCitiesOfficialRelationshipMatcher {
  private readonly candidates: PostgresRelationshipCandidateService;
  constructor(private readonly pool: Pool) {
    this.candidates = new PostgresRelationshipCandidateService(pool);
  }
  async resolve(input: OfficialRelationshipReference): Promise<ReferenceResolution> {
    const mandatory = [
      input.registryId, input.fromRecordId, input.relationshipTypeId,
      input.targetRecordTypeId, input.targetIdentifierScheme,
      input.targetExternalId, input.sourceUrl, input.sourceKey, input.sourceField,
    ];
    if (mandatory.some((value) => !value?.trim())) {
      return { reference: input, status: "invalid", reason: "Missing required provenance or identifier." };
    }
    let url: URL;
    try { url = new URL(input.sourceUrl); }
    catch { return { reference: input, status: "invalid", reason: "Source URL is invalid." }; }
    if (url.protocol !== "https:" || url.username || url.password) {
      return { reference: input, status: "invalid", reason: "Source must be an HTTPS URL without credentials." };
    }
    // Exact, registry-scoped identity matching only. Never infer from a similar name.
    const matches = await this.pool.query<MatchedRow>(`
      SELECT id FROM civic_registry_records
      WHERE registry_id = $1 AND record_type_id = $2
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(external_identifiers) AS item
          WHERE item->>'scheme' = $3 AND item->>'value' = $4
        )
      ORDER BY id LIMIT 2
    `, [input.registryId, input.targetRecordTypeId,
      input.targetIdentifierScheme, input.targetExternalId]);
    if (matches.rows.length === 0)
      return { reference: input, status: "unmatched", reason: "No exact external identifier match." };
    if (matches.rows.length > 1)
      return { reference: input, status: "ambiguous", reason: "Multiple exact matches; manual disambiguation required." };
    const targetId = matches.rows[0].id;
    if (targetId === input.fromRecordId)
      return { reference: input, status: "invalid", reason: "Self-link rejected." };
    const id = candidateIdForReference(input, targetId);
    const result = await this.candidates.propose({
      id, registryId: input.registryId, relationshipTypeId: input.relationshipTypeId,
      fromRecordId: input.fromRecordId, toRecordId: targetId,
      extractor: "smart-cities-official-reference", extractorVersion: "1",
      confidence: 1,
      evidence: {
        sourceUrl: input.sourceUrl, sourceKey: input.sourceKey,
        sourceField: input.sourceField, targetIdentifierScheme: input.targetIdentifierScheme,
        targetExternalId: input.targetExternalId, matchBasis: "exact-external-identifier",
      },
      metadata: { reviewRequired: true, publicationAutomated: false },
    });
    return {
      reference: input,
      status: result.kind === "relationship_exists" ? "existing" : "proposed",
      candidateId: result.kind === "candidate" ? result.candidate.id : undefined,
      matchedRecordId: targetId,
    };
  }
  async resolveBatch(inputs: OfficialRelationshipReference[]): Promise<ReferenceResolution[]> {
    const results: ReferenceResolution[] = [];
    for (const input of inputs) results.push(await this.resolve(input));
    return results;
  }
}

export * from "./mapping.ts";
export * from "./integration.ts";

export * from "./provider-projection.ts";
