import {
  compileRegistryConfig,
} from "@civic-registry/config";
import {
  PostgresRegistryConfigRepository,
} from "@civic-registry/database";
import {
  PostgresPdfAttachmentService,
  type PdfAttachmentIngestionItem,
} from "@civic-registry/database/attachments";
import type {
  DocumentStorage,
} from "@civic-registry/documents";
import type {
  PublicSourceClient,
  SourceAdapterRow,
} from "@civic-registry/source-adapters";
import type {
  Pool,
  QueryResultRow,
} from "pg";

export interface SmartCitiesDocumentIngestionInput {
  registryId: string;
  rows: SourceAdapterRow[];
  allowedHosts: readonly string[];
  externalIdentifierScheme?: string;
  fieldIdByRecordType?: Record<
    string,
    string
  >;
  retrievedAt?: string;
}

export interface SmartCitiesDocumentIngestionRowResult {
  externalId: string;
  recordId?: string;
  status:
    | "ingested"
    | "no_attachments"
    | "record_not_found"
    | "ambiguous_record";
  attachments: PdfAttachmentIngestionItem[];
  warnings: string[];
}

export interface SmartCitiesDocumentIngestionResult {
  rows: SmartCitiesDocumentIngestionRowResult[];
  matchedRecords: number;
  attachmentCreated: number;
  attachmentExisting: number;
  attachmentFailed: number;
}

interface RecordMatchRow extends QueryResultRow {
  id: string;
  record_type_id: string;
  fields: Record<string, unknown>;
}

function titleValue(
  fields: Record<string, unknown>,
  fieldId: string,
  fallback: string,
): string {
  const value = fields[fieldId];

  return typeof value === "string" &&
    value.trim()
    ? value.trim()
    : fallback;
}

export class SmartCitiesDocumentIngestionService {
  private readonly pool: Pool;
  private readonly configs:
    PostgresRegistryConfigRepository;
  private readonly attachments:
    PostgresPdfAttachmentService;

  constructor(
    pool: Pool,
    storage: DocumentStorage,
    options: {
      client?: PublicSourceClient;
      maxResponseBytes?: number;
    } = {},
  ) {
    this.pool = pool;
    this.configs =
      new PostgresRegistryConfigRepository(
        pool,
      );
    this.attachments =
      new PostgresPdfAttachmentService(
        pool,
        storage,
        options,
      );
  }

  private async findRecord(
    registryId: string,
    scheme: string,
    externalId: string,
  ): Promise<RecordMatchRow[]> {
    const result =
      await this.pool.query<RecordMatchRow>(
        `SELECT
           record.id,
           record.record_type_id,
           record.fields
         FROM civic_registry_records
           AS record
         WHERE record.registry_id = $1
           AND EXISTS (
             SELECT 1
             FROM jsonb_array_elements(
               record.external_identifiers
             ) AS identifier
             WHERE identifier
               ->> 'scheme' = $2
               AND identifier
               ->> 'value' = $3
           )
         ORDER BY record.id
         LIMIT 2`,
        [
          registryId,
          scheme,
          externalId,
        ],
      );

    return result.rows;
  }

  async ingestAdapterRows(
    input: SmartCitiesDocumentIngestionInput,
  ): Promise<SmartCitiesDocumentIngestionResult> {
    const configFile =
      await this.configs.get(
        input.registryId,
      );

    if (!configFile) {
      throw new Error(
        "Registry configuration " +
          input.registryId +
          " does not exist.",
      );
    }

    const registry =
      compileRegistryConfig(
        configFile,
      );
    const scheme =
      input.externalIdentifierScheme ??
      "official-record";
    const rows:
      SmartCitiesDocumentIngestionRowResult[] =
        [];

    for (const sourceRow of input.rows) {
      const attachmentUrls = [
        ...new Set(
          (
            sourceRow
              .attachment_urls ?? []
          )
            .map((url) =>
              url.trim(),
            )
            .filter(Boolean),
        ),
      ];

      if (
        attachmentUrls.length === 0
      ) {
        rows.push({
          externalId:
            sourceRow.external_id,
          status:
            "no_attachments",
          attachments: [],
          warnings: [],
        });
        continue;
      }

      const matches =
        await this.findRecord(
          input.registryId,
          scheme,
          sourceRow.external_id,
        );

      if (matches.length === 0) {
        rows.push({
          externalId:
            sourceRow.external_id,
          status:
            "record_not_found",
          attachments: [],
          warnings: [
            "No registry record matches " +
              scheme +
              "=" +
              sourceRow.external_id +
              ".",
          ],
        });
        continue;
      }

      if (matches.length > 1) {
        rows.push({
          externalId:
            sourceRow.external_id,
          status:
            "ambiguous_record",
          attachments: [],
          warnings: [
            "Multiple registry records match " +
              scheme +
              "=" +
              sourceRow.external_id +
              "; document ingestion was skipped.",
          ],
        });
        continue;
      }

      const match = matches[0];
      const recordType =
        registry.getRecordType(
          match.record_type_id,
        );
      const recordTitle =
        titleValue(
          match.fields,
          recordType.definition
            .titleFieldId,
          sourceRow.title,
        );
      const fieldId =
        input.fieldIdByRecordType?.[
          match.record_type_id
        ];

      if (
        fieldId &&
        !recordType.fieldsById.has(
          fieldId,
        )
      ) {
        throw new Error(
          "Configured document citation field " +
            fieldId +
            " is not valid for record type " +
            match.record_type_id +
            ".",
        );
      }

      const result =
        await this.attachments.ingest({
          registryId:
            input.registryId,
          recordId: match.id,
          recordTitle,
          attachmentUrls,
          allowedHosts:
            input.allowedHosts,
          fieldId,
          retrievedAt:
            input.retrievedAt,
        });

      rows.push({
        externalId:
          sourceRow.external_id,
        recordId: match.id,
        status: "ingested",
        attachments:
          result.items,
        warnings:
          result.items.flatMap(
            (item) =>
              item.warnings,
          ),
      });
    }

    return {
      rows,
      matchedRecords:
        rows.filter(
          (row) =>
            row.status ===
            "ingested",
        ).length,
      attachmentCreated:
        rows.reduce(
          (count, row) =>
            count +
            row.attachments.filter(
              (item) =>
                item.status ===
                "created",
            ).length,
          0,
        ),
      attachmentExisting:
        rows.reduce(
          (count, row) =>
            count +
            row.attachments.filter(
              (item) =>
                item.status ===
                "existing",
            ).length,
          0,
        ),
      attachmentFailed:
        rows.reduce(
          (count, row) =>
            count +
            row.attachments.filter(
              (item) =>
                item.status ===
                "failed",
            ).length,
          0,
        ),
    };
  }
}
