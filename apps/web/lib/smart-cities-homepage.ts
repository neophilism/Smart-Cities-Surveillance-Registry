import {
  compileRegistryConfig,
} from "@civic-registry/config";
import {
  PostgresRegistryConfigRepository,
  PostgresSearchProvider,
} from "@civic-registry/database";
import type {
  Pool,
  QueryResultRow,
} from "pg";

import {
  SMART_CITIES_REGISTRY_ID,
  scanSmartCitiesPublicRecord,
} from "./smart-cities-public-safety.ts";

export interface HomepageRecordType {
  id: string;
  name: string;
  pluralName: string;
  description?: string;
  count: number;
}

export interface HomepageRecentRecord {
  id: string;
  recordTypeId: string;
  recordTypeName: string;
  title: string;
  summary?: string;
  publishedAt?: string;
}

export interface HomepageDeadline {
  id: string;
  recordId: string;
  recordTypeId: string;
  recordTypeName: string;
  recordTitle: string;
  deadlineTypeId: string;
  label: string;
  dueAt: string;
}

export interface SmartCitiesHomepageData {
  registryId: string;
  registryName: string;
  description?: string;
  totalRecords: number;
  deployments: number;
  technologies: number;
  agencies: number;
  vendors: number;
  audits: number;
  incidents: number;
  recordTypes: HomepageRecordType[];
  recentRecords: HomepageRecentRecord[];
  upcomingDeadlines: HomepageDeadline[];
}

interface DeadlineRow extends QueryResultRow {
  id: string;
  record_id: string;
  record_type_id: string;
  public_fields: Record<string, unknown>;
  deadline_type_id: string;
  due_at: Date;
}

function publicStatuses(
  config: ReturnType<
    typeof compileRegistryConfig
  >,
): string[] | undefined {
  return config.publicationLifecycle
    ? [...config.publicationLifecycle.publicStatusIds]
    : undefined;
}

function fieldText(
  fields: Record<string, unknown>,
  fieldId: string | undefined,
): string | undefined {
  if (!fieldId) return undefined;
  const value = fields[fieldId];

  if (
    typeof value !== "string" ||
    value.trim().length === 0
  ) {
    return undefined;
  }

  return value;
}

export async function loadSmartCitiesHomepageData(
  pool: Pool,
  options: {
    now?: string;
  } = {},
): Promise<SmartCitiesHomepageData | null> {
  const configs =
    new PostgresRegistryConfigRepository(pool);
  const configFile = await configs.get(
    SMART_CITIES_REGISTRY_ID,
  );

  if (!configFile) return null;

  const config =
    compileRegistryConfig(configFile);
  const search =
    new PostgresSearchProvider(pool);
  const statuses = publicStatuses(config);

  const result = await search.search(
    config,
    {
      registryId:
        SMART_CITIES_REGISTRY_ID,
      projection: "public",
      visibility: "public",
      statuses,
      sort: {
        by: "published",
        direction: "desc",
      },
      page: 1,
      pageSize: 6,
    },
  );

  const countByType = new Map(
    result.facets.recordTypes.map(
      (bucket) => [
        bucket.value,
        bucket.count,
      ],
    ),
  );

  const recordTypes =
    config.definition.recordTypes.map(
      (recordType) => ({
        id: recordType.id,
        name: recordType.name,
        pluralName:
          recordType.pluralName,
        description:
          recordType.description,
        count:
          countByType.get(
            recordType.id,
          ) ?? 0,
      }),
    );

  const recentRecords =
    result.hits.flatMap(
      ({ record }) => {
        if (
          scanSmartCitiesPublicRecord(
            record,
          ).length > 0
        ) {
          return [];
        }

        const recordType =
          config.getRecordType(
            record.recordTypeId,
          );
        const title = fieldText(
          record.fields,
          recordType.definition
            .titleFieldId,
        );

        if (!title) return [];

        return [
          {
            id: record.id,
            recordTypeId:
              record.recordTypeId,
            recordTypeName:
              recordType.definition.name,
            title,
            summary: fieldText(
              record.fields,
              recordType.definition
                .summaryFieldId,
            ),
            publishedAt:
              record.publishedAt,
          },
        ];
      },
    );

  const now =
    options.now ??
    new Date().toISOString();

  const deadlineRows =
    await pool.query<DeadlineRow>(
      `SELECT
         deadline.id,
         deadline.record_id,
         record.record_type_id,
         record.public_fields,
         deadline.deadline_type_id,
         deadline.due_at
       FROM civic_registry_deadlines AS deadline
       INNER JOIN civic_registry_records AS record
         ON record.registry_id =
              deadline.registry_id
        AND record.id =
              deadline.record_id
       LEFT JOIN civic_registry_record_disclosures
         AS disclosure
         ON disclosure.registry_id =
              record.registry_id
        AND disclosure.record_id =
              record.id
       WHERE deadline.registry_id = $1
         AND deadline.state = 'open'
         AND deadline.due_at >= $2::timestamptz
         AND record.visibility = 'public'
         AND (
           $3::text[] IS NULL
           OR record.status = ANY($3::text[])
         )
         AND COALESCE(
           disclosure.disposition,
           'disclosed'
         ) <> 'withheld'
         AND civic_registry_deadline_is_public(
           deadline.registry_id,
           deadline.record_id,
           deadline.deadline_type_id
         )
       ORDER BY deadline.due_at ASC,
                deadline.id ASC
       LIMIT 6`,
      [
        SMART_CITIES_REGISTRY_ID,
        now,
        statuses ?? null,
      ],
    );

  const upcomingDeadlines =
    deadlineRows.rows.flatMap(
      (row) => {
        const definition =
          config.deadlines?.definitionsById.get(
            row.deadline_type_id,
          );
        const recordType =
          config.recordTypesById.get(
            row.record_type_id,
          );

        if (
          !definition ||
          !recordType
        ) {
          return [];
        }

        const recordTitle =
          fieldText(
            row.public_fields,
            recordType.definition
              .titleFieldId,
          ) ?? "Public record";

        return [
          {
            id: row.id,
            recordId: row.record_id,
            recordTypeId:
              row.record_type_id,
            recordTypeName:
              recordType.definition.name,
            recordTitle,
            deadlineTypeId:
              row.deadline_type_id,
            label: definition.label,
            dueAt:
              row.due_at.toISOString(),
          },
        ];
      },
    );

  const count = (
    recordTypeId: string,
  ) => countByType.get(recordTypeId) ?? 0;

  return {
    registryId:
      config.definition.id,
    registryName:
      config.definition.name,
    description:
      config.definition.description,
    totalRecords: result.total,
    deployments: count("deployment"),
    technologies: count("technology"),
    agencies: count("agency"),
    vendors: count("vendor"),
    audits: count("audit"),
    incidents: count("violation"),
    recordTypes,
    recentRecords,
    upcomingDeadlines,
  };
}
