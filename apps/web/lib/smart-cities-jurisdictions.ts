import type {
  CompiledRegistryConfig,
} from "@civic-registry/config";
import {
  PostgresSearchProvider,
} from "@civic-registry/database";
import type {
  Pool,
  QueryResultRow,
} from "pg";

import {
  resolveSmartCitiesCandidateRecordIds,
} from "./smart-cities-search.ts";
import {
  SMART_CITIES_REGISTRY_ID,
} from "./smart-cities-public-safety.ts";

export interface JurisdictionSummary {
  name: string;
  deployments: number;
  activeDeployments: number;
  agencies: number;
}

export interface JurisdictionDeployment {
  id: string;
  name: string;
  status: string;
  publicLocationScope?: string;
}

export interface JurisdictionMapScope {
  label: string;
  deploymentCount: number;
  deployments: Array<{
    id: string;
    name: string;
  }>;
}

export interface JurisdictionDeadline {
  id: string;
  recordId: string;
  recordTitle: string;
  recordTypeId: string;
  deadlineTypeId: string;
  label: string;
  dueAt: string;
}

export interface JurisdictionDetail {
  name: string;
  totalConnectedRecords: number;
  recordTypeCounts: Record<string, number>;
  deployments: JurisdictionDeployment[];
  mapScopes: JurisdictionMapScope[];
  upcomingDeadlines: JurisdictionDeadline[];
}

interface SummaryRow extends QueryResultRow {
  jurisdiction: string;
  deployments: number;
  active_deployments: number;
  agencies: number;
}

interface DeploymentRow extends QueryResultRow {
  id: string;
  name: string;
  deployment_status: string;
  public_location_scope: string | null;
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
  registry: CompiledRegistryConfig,
): string[] | undefined {
  return registry.publicationLifecycle
    ? [
        ...registry.publicationLifecycle
          .publicStatusIds,
      ]
    : undefined;
}

export async function loadSmartCitiesJurisdictionSummaries(
  pool: Pool,
  registry: CompiledRegistryConfig,
): Promise<JurisdictionSummary[]> {
  if (
    registry.definition.id !==
    SMART_CITIES_REGISTRY_ID
  ) {
    return [];
  }

  const statuses =
    publicStatuses(registry);

  const result =
    await pool.query<SummaryRow>(
      `WITH public_records AS (
         SELECT
           record.record_type_id,
           record.public_fields
         FROM civic_registry_records
           AS record
         LEFT JOIN civic_registry_record_disclosures
           AS disclosure
           ON disclosure.registry_id =
                record.registry_id
          AND disclosure.record_id =
                record.id
         WHERE record.registry_id = $1
           AND record.visibility = 'public'
           AND (
             $2::text[] IS NULL
             OR record.status =
                ANY($2::text[])
           )
           AND COALESCE(
             disclosure.disposition,
             'disclosed'
           ) <> 'withheld'
           AND record.record_type_id IN (
             'deployment',
             'agency'
           )
           AND NULLIF(
             record.public_fields
               ->> 'jurisdiction',
             ''
           ) IS NOT NULL
       )
       SELECT
         public_fields
           ->> 'jurisdiction'
           AS jurisdiction,
         COUNT(*) FILTER (
           WHERE record_type_id =
             'deployment'
         )::int AS deployments,
         COUNT(*) FILTER (
           WHERE record_type_id =
             'deployment'
             AND public_fields
               ->> 'deployment_status'
                 = 'active'
         )::int AS active_deployments,
         COUNT(*) FILTER (
           WHERE record_type_id =
             'agency'
         )::int AS agencies
       FROM public_records
       GROUP BY jurisdiction
       ORDER BY jurisdiction`,
      [
        SMART_CITIES_REGISTRY_ID,
        statuses ?? null,
      ],
    );

  return result.rows.map(
    (row) => ({
      name: row.jurisdiction,
      deployments:
        Number(row.deployments),
      activeDeployments:
        Number(
          row.active_deployments,
        ),
      agencies: Number(row.agencies),
    }),
  );
}

function titleFromFields(
  registry: CompiledRegistryConfig,
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
    ? value
    : "Public record";
}

export async function loadSmartCitiesJurisdictionDetail(
  pool: Pool,
  registry: CompiledRegistryConfig,
  jurisdiction: string,
  options: {
    now?: string;
  } = {},
): Promise<JurisdictionDetail | null> {
  if (
    registry.definition.id !==
    SMART_CITIES_REGISTRY_ID
  ) {
    return null;
  }

  const statuses =
    publicStatuses(registry);
  const candidateIds =
    await resolveSmartCitiesCandidateRecordIds(
      pool,
      registry,
      {
        jurisdiction,
      },
    );

  if (
    !candidateIds ||
    candidateIds.length === 0
  ) {
    return null;
  }

  const search =
    new PostgresSearchProvider(pool);
  const result = await search.search(
    registry,
    {
      registryId:
        SMART_CITIES_REGISTRY_ID,
      projection: "public",
      visibility: "public",
      statuses,
      recordIds: candidateIds,
      page: 1,
      pageSize: 1,
    },
  );

  const deploymentResult =
    await pool.query<DeploymentRow>(
      `SELECT
         record.id,
         record.public_fields
           ->> 'name' AS name,
         record.public_fields
           ->> 'deployment_status'
           AS deployment_status,
         NULLIF(
           record.public_fields
             ->> 'public_location_scope',
           ''
         ) AS public_location_scope
       FROM civic_registry_records
         AS record
       LEFT JOIN civic_registry_record_disclosures
         AS disclosure
         ON disclosure.registry_id =
              record.registry_id
        AND disclosure.record_id =
              record.id
       WHERE record.registry_id = $1
         AND record.visibility = 'public'
         AND (
           $2::text[] IS NULL
           OR record.status =
              ANY($2::text[])
         )
         AND record.record_type_id =
              'deployment'
         AND COALESCE(
           disclosure.disposition,
           'disclosed'
         ) <> 'withheld'
         AND record.public_fields
           ->> 'jurisdiction' = $3
       ORDER BY
         record.public_fields
           ->> 'name',
         record.id`,
      [
        SMART_CITIES_REGISTRY_ID,
        statuses ?? null,
        jurisdiction,
      ],
    );

  const deployments =
    deploymentResult.rows.map(
      (row) => ({
        id: row.id,
        name: row.name,
        status:
          row.deployment_status,
        publicLocationScope:
          row.public_location_scope ??
          undefined,
      }),
    );

  const scopes = new Map<
    string,
    JurisdictionMapScope
  >();

  for (const deployment of deployments) {
    const scope =
      deployment.publicLocationScope ??
      "Jurisdiction-wide or unspecified public scope";
    const existing = scopes.get(scope);

    if (existing) {
      existing.deploymentCount += 1;
      existing.deployments.push({
        id: deployment.id,
        name: deployment.name,
      });
    } else {
      scopes.set(scope, {
        label: scope,
        deploymentCount: 1,
        deployments: [
          {
            id: deployment.id,
            name: deployment.name,
          },
        ],
      });
    }
  }

  const now =
    options.now ??
    new Date().toISOString();
  const deadlineResult =
    await pool.query<DeadlineRow>(
      `SELECT
         deadline.id,
         deadline.record_id,
         record.record_type_id,
         record.public_fields,
         deadline.deadline_type_id,
         deadline.due_at
       FROM civic_registry_deadlines
         AS deadline
       INNER JOIN civic_registry_records
         AS record
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
         AND deadline.record_id =
             ANY($2::text[])
         AND deadline.state = 'open'
         AND deadline.due_at >=
             $3::timestamptz
         AND record.visibility = 'public'
         AND (
           $4::text[] IS NULL
           OR record.status =
              ANY($4::text[])
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
       ORDER BY deadline.due_at,
                deadline.id
       LIMIT 8`,
      [
        SMART_CITIES_REGISTRY_ID,
        candidateIds,
        now,
        statuses ?? null,
      ],
    );

  const recordTypeCounts:
    Record<string, number> = {};

  for (
    const bucket of
    result.facets.recordTypes
  ) {
    recordTypeCounts[
      bucket.value
    ] = bucket.count;
  }

  const upcomingDeadlines =
    deadlineResult.rows.flatMap(
      (row) => {
        const definition =
          registry.deadlines
            ?.definitionsById.get(
              row.deadline_type_id,
            );

        if (!definition) {
          return [];
        }

        return [
          {
            id: row.id,
            recordId:
              row.record_id,
            recordTitle:
              titleFromFields(
                registry,
                row.record_type_id,
                row.public_fields,
              ),
            recordTypeId:
              row.record_type_id,
            deadlineTypeId:
              row.deadline_type_id,
            label:
              definition.label,
            dueAt:
              row.due_at.toISOString(),
          },
        ];
      },
    );

  return {
    name: jurisdiction,
    totalConnectedRecords:
      result.total,
    recordTypeCounts,
    deployments,
    mapScopes: [...scopes.values()],
    upcomingDeadlines,
  };
}
