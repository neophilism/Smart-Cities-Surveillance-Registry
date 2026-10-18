import { randomUUID } from "node:crypto";
import type { createDatabasePool } from "../../database/src/pool.ts";
import { importExternalClaims } from "./index.ts";
type Pool = ReturnType<typeof createDatabasePool>;

export interface ExternalClaimRow {
  registryId: string; recordId: string; providerId: string;
  sourceId: string; sourceUrl: string; observedAt: string;
  kind: "authorization" | "accountability" | "audit"; assertion: string;
}
export interface StoredExternalClaim extends ExternalClaimRow { importId: string; importedAt: string; }
export interface ExternalClaimScope { registryId: string; recordId: string; providerId: string; }
export interface ExternalImportResult { importId: string; received: number; inserted: number; }

/** Private evidence store. No public API or publication lifecycle reads these rows automatically. */
export class PostgresExternalComplianceRepository {
  private readonly pool: Pool;
  constructor(pool: Pool) { this.pool = pool; }

  async importClaims(scope: ExternalClaimScope, claims: readonly ExternalClaimRow[]): Promise<ExternalImportResult> {
    if (!scope.registryId || !scope.recordId || !scope.providerId || claims.length > 500) throw new Error("Invalid import scope or batch");
    const batch = importExternalClaims(claims, scope);
    if (batch.rejected.length) throw new Error(batch.rejected[0].error);
    const normalized = batch.accepted;
    const client = await this.pool.connect();
    const importId = randomUUID();
    try {
      await client.query("BEGIN");
      const record = await client.query(
        "SELECT 1 FROM civic_registry_records WHERE registry_id = $1 AND id = $2 FOR KEY SHARE",
        [scope.registryId, scope.recordId],
      );
      if (!record.rows[0]) throw new Error("Scoped record not found");
      await client.query(
        `INSERT INTO smart_cities_external_claim_imports
          (id, registry_id, record_id, provider_id, status, received_count, inserted_count)
          VALUES ($1, $2, $3, $4, 'completed', $5, 0)`,
        [importId, scope.registryId, scope.recordId, scope.providerId, claims.length],
      );
      let inserted = 0;
      for (const claim of normalized) {
        const result = await client.query(
          `INSERT INTO smart_cities_external_claims
            (registry_id, record_id, provider_id, source_id, kind, observed_at, source_url, assertion, import_id)
            VALUES ($1, $2, $3, $4, $5, $6::timestamptz, $7, $8, $9)
            ON CONFLICT DO NOTHING`,
          [scope.registryId, scope.recordId, scope.providerId, claim.sourceId, claim.kind,
           claim.observedAt, claim.sourceUrl, claim.assertion, importId],
        );
        inserted += result.rowCount ?? 0;
      }
      await client.query(
        "UPDATE smart_cities_external_claim_imports SET inserted_count = $2 WHERE id = $1",
        [importId, inserted],
      );
      await client.query("COMMIT");
      return { importId, received: claims.length, inserted };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }

  async recordFailure(scope: ExternalClaimScope, errorCode: "PROVIDER_ERROR" | "INVALID_RESPONSE"): Promise<string> {
    const id = randomUUID();
    await this.pool.query(
      `INSERT INTO smart_cities_external_claim_imports
        (id, registry_id, record_id, provider_id, status, received_count, inserted_count, error_code)
        VALUES ($1, $2, $3, $4, 'failed', 0, 0, $5)`,
      [id, scope.registryId, scope.recordId, scope.providerId, errorCode],
    );
    return id;
  }

  async listForRecord(registryId: string, recordId: string): Promise<StoredExternalClaim[]> {
    const result = await this.pool.query(
      `SELECT registry_id, record_id, provider_id, source_id, source_url, observed_at, kind, assertion, import_id, created_at
       FROM smart_cities_external_claims
       WHERE registry_id = $1 AND record_id = $2
       ORDER BY observed_at DESC, provider_id, source_id LIMIT 500`,
      [registryId, recordId],
    );
    return result.rows.map(item => {
      const row = item as {
        registry_id: string; record_id: string; provider_id: string; source_id: string;
        source_url: string; observed_at: Date; kind: ExternalClaimRow["kind"]; assertion: string;
        import_id: string; created_at: Date;
      };
      return {
      registryId: row.registry_id, recordId: row.record_id, providerId: row.provider_id,
      sourceId: row.source_id, sourceUrl: row.source_url,
      observedAt: row.observed_at.toISOString(), kind: row.kind, assertion: row.assertion,
      importId: row.import_id, importedAt: row.created_at.toISOString(),
    }; });
  }
}
