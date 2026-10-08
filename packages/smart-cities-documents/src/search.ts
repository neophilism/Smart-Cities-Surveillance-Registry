import {
  compileRegistryConfig,
} from "@civic-registry/config";
import {
  PostgresRegistryConfigRepository,
} from "@civic-registry/database";
import type {
  Pool,
  QueryResultRow,
} from "pg";

export interface SmartCitiesDocumentSearchResult {
  citationId: string;
  recordId: string;
  recordTypeId: string;
  recordTitle: string;
  fieldId?: string;
  documentId: string;
  documentTitle: string;
  documentUrl?: string;
  sourceUrl?: string;
  matchedPages: number[];
  extractedAt: string;
}

interface SearchRow extends QueryResultRow {
  citation_id: string;
  record_id: string;
  record_type_id: string;
  public_fields: Record<string, unknown>;
  field_id: string | null;
  document_id: string;
  document_title: string;
  document_url: string | null;
  source_url: string | null;
  matched_pages: number[];
  extracted_at: Date;
}

function publicStatuses(
  registry: ReturnType<
    typeof compileRegistryConfig
  >,
): string[] | undefined {
  return registry.publicationLifecycle
    ? [
        ...registry.publicationLifecycle
          .publicStatusIds,
      ]
    : undefined;
}

function recordTitle(
  registry: ReturnType<
    typeof compileRegistryConfig
  >,
  recordTypeId: string,
  fields: Record<string, unknown>,
): string {
  const recordType =
    registry.getRecordType(
      recordTypeId,
    );
  const value =
    fields[
      recordType.definition
        .titleFieldId
    ];

  return typeof value === "string" &&
    value.trim()
    ? value.trim()
    : "Public record";
}

export async function searchSmartCitiesDocumentText(
  pool: Pool,
  input: {
    registryId: string;
    query: string;
    limit?: number;
  },
): Promise<SmartCitiesDocumentSearchResult[]> {
  const query = input.query.trim();

  if (!query) {
    return [];
  }

  const configs =
    new PostgresRegistryConfigRepository(
      pool,
    );
  const configFile =
    await configs.get(
      input.registryId,
    );

  if (!configFile) {
    return [];
  }

  const registry =
    compileRegistryConfig(
      configFile,
    );
  const statuses =
    publicStatuses(registry);
  const limit = Math.max(
    1,
    Math.min(
      100,
      input.limit ?? 25,
    ),
  );

  const result =
    await pool.query<SearchRow>(
      `SELECT
         citation.id AS citation_id,
         record.id AS record_id,
         record.record_type_id,
         record.public_fields,
         citation.field_id,
         document.id AS document_id,
         document.title
           AS document_title,
         document.canonical_url
           AS document_url,
         source.canonical_url
           AS source_url,
         ARRAY(
           SELECT
             (page.value
               ->> 'page')::int
           FROM jsonb_array_elements(
             extraction.pages
           ) AS page(value)
           WHERE to_tsvector(
             'simple',
             COALESCE(
               page.value
                 ->> 'text',
               ''
             )
           ) @@ websearch_to_tsquery(
             'simple',
             $3
           )
           ORDER BY
             (page.value
               ->> 'page')::int
         ) AS matched_pages,
         extraction.extracted_at
       FROM civic_registry_document_extractions
         AS extraction
       INNER JOIN civic_registry_documents
         AS document
         ON document.registry_id =
              extraction.registry_id
        AND document.id =
              extraction.document_id
       INNER JOIN civic_registry_citations
         AS citation
         ON citation.registry_id =
              extraction.registry_id
        AND citation.document_id =
              extraction.document_id
       INNER JOIN civic_registry_records
         AS record
         ON record.registry_id =
              citation.registry_id
        AND record.id =
              citation.record_id
       LEFT JOIN civic_registry_sources
         AS source
         ON source.registry_id =
              document.registry_id
        AND source.id =
              document.source_id
       LEFT JOIN civic_registry_record_disclosures
         AS record_disclosure
         ON record_disclosure.registry_id =
              record.registry_id
        AND record_disclosure.record_id =
              record.id
       LEFT JOIN civic_registry_document_disclosures
         AS document_disclosure
         ON document_disclosure.registry_id =
              document.registry_id
        AND document_disclosure.document_id =
              document.id
       WHERE extraction.registry_id = $1
         AND record.visibility = 'public'
         AND (
           $2::text[] IS NULL
           OR record.status =
              ANY($2::text[])
         )
         AND citation.visibility = 'public'
         AND document.visibility = 'public'
         AND (
           source.id IS NULL
           OR source.visibility = 'public'
         )
         AND COALESCE(
           record_disclosure.disposition,
           'disclosed'
         ) <> 'withheld'
         AND COALESCE(
           document_disclosure.disposition,
           'disclosed'
         ) = 'disclosed'
         AND NOT EXISTS (
           SELECT 1
           FROM civic_registry_document_redactions
             AS redaction
           WHERE redaction.registry_id =
             document.registry_id
             AND redaction.document_id =
               document.id
         )
         AND (
           citation.field_id IS NULL
           OR NOT EXISTS (
             SELECT 1
             FROM civic_registry_field_disclosures
               AS field_disclosure
             WHERE field_disclosure.registry_id =
               citation.registry_id
               AND field_disclosure.record_id =
                 citation.record_id
               AND field_disclosure.field_id =
                 citation.field_id
           )
         )
         AND extraction.search_document
           @@ websearch_to_tsquery(
             'simple',
             $3
           )
       ORDER BY
         extraction.extracted_at DESC,
         document.title,
         citation.id
       LIMIT $4`,
      [
        input.registryId,
        statuses ?? null,
        query,
        limit,
      ],
    );

  return result.rows.map(
    (row) => ({
      citationId:
        row.citation_id,
      recordId: row.record_id,
      recordTypeId:
        row.record_type_id,
      recordTitle:
        recordTitle(
          registry,
          row.record_type_id,
          row.public_fields,
        ),
      fieldId:
        row.field_id ??
        undefined,
      documentId:
        row.document_id,
      documentTitle:
        row.document_title,
      documentUrl:
        row.document_url ??
        undefined,
      sourceUrl:
        row.source_url ??
        undefined,
      matchedPages:
        row.matched_pages ?? [],
      extractedAt:
        row.extracted_at.toISOString(),
    }),
  );
}
