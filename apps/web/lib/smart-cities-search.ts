import type {
  CompiledRegistryConfig,
} from "@civic-registry/config";
import type {
  Pool,
  QueryResultRow,
} from "pg";

import {
  firstSearchValue,
  type PublicSearchParams,
} from "./search-params.ts";
import {
  SMART_CITIES_REGISTRY_ID,
} from "./smart-cities-public-safety.ts";

export interface SmartCitiesAdvancedFilters {
  jurisdiction?: string;
  agencyId?: string;
  vendorId?: string;
  technologyCategory?: string;
  deploymentStatus?: string;
  dataCategory?: string;
  retentionMin?: number;
  retentionMax?: number;
  legalProcess?: string;
  policyStatus?: string;
  auditStatus?: string;
  incidentStatus?: string;
}

export interface SmartCitiesFilterOption {
  value: string;
  label: string;
}

export interface SmartCitiesAdvancedFilterOptions {
  jurisdictions: SmartCitiesFilterOption[];
  agencies: SmartCitiesFilterOption[];
  vendors: SmartCitiesFilterOption[];
}

interface IdRow extends QueryResultRow {
  id: string;
}

interface OptionRow extends QueryResultRow {
  value: string;
  label: string;
}

function finiteNumber(
  value: string | undefined,
): number | undefined {
  if (!value) return undefined;

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : undefined;
}

export function parseSmartCitiesAdvancedFilters(
  params: PublicSearchParams,
): SmartCitiesAdvancedFilters {
  return {
    jurisdiction:
      firstSearchValue(
        params.sc_jurisdiction,
      )?.trim() || undefined,
    agencyId:
      firstSearchValue(
        params.sc_agency,
      )?.trim() || undefined,
    vendorId:
      firstSearchValue(
        params.sc_vendor,
      )?.trim() || undefined,
    technologyCategory:
      firstSearchValue(
        params.sc_technology,
      )?.trim() || undefined,
    deploymentStatus:
      firstSearchValue(
        params.sc_deployment_status,
      )?.trim() || undefined,
    dataCategory:
      firstSearchValue(
        params.sc_data_category,
      )?.trim() || undefined,
    retentionMin: finiteNumber(
      firstSearchValue(
        params.sc_retention_min,
      ),
    ),
    retentionMax: finiteNumber(
      firstSearchValue(
        params.sc_retention_max,
      ),
    ),
    legalProcess:
      firstSearchValue(
        params.sc_legal_process,
      )?.trim() || undefined,
    policyStatus:
      firstSearchValue(
        params.sc_policy_status,
      )?.trim() || undefined,
    auditStatus:
      firstSearchValue(
        params.sc_audit_status,
      )?.trim() || undefined,
    incidentStatus:
      firstSearchValue(
        params.sc_incident_status,
      )?.trim() || undefined,
  };
}

export function hasSmartCitiesAdvancedFilters(
  filters: SmartCitiesAdvancedFilters,
): boolean {
  return Object.values(filters).some(
    (value) => value !== undefined,
  );
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

async function anchorIds(
  pool: Pool,
  registry: CompiledRegistryConfig,
  whereSql: string,
  values: unknown[],
): Promise<string[]> {
  const statuses =
    publicStatuses(registry);
  const statusSql = statuses
    ? "AND record.status = ANY($2::text[])"
    : "";
  const offset = statuses ? 2 : 1;
  const shiftedWhere = whereSql.replace(
    /\$(\d+)/g,
    (_, raw: string) =>
      "$" +
      (Number.parseInt(raw, 10) +
        offset),
  );
  const queryValues = statuses
    ? [
        SMART_CITIES_REGISTRY_ID,
        statuses,
        ...values,
      ]
    : [
        SMART_CITIES_REGISTRY_ID,
        ...values,
      ];

  const result = await pool.query<IdRow>(
    `SELECT record.id
     FROM civic_registry_records AS record
     LEFT JOIN civic_registry_record_disclosures
       AS disclosure
       ON disclosure.registry_id =
            record.registry_id
      AND disclosure.record_id =
            record.id
     WHERE record.registry_id = $1
       AND record.visibility = 'public'
       ${statusSql}
       AND COALESCE(
         disclosure.disposition,
         'disclosed'
       ) <> 'withheld'
       AND ${shiftedWhere}
     ORDER BY record.id
     LIMIT 5001`,
    queryValues,
  );

  if (result.rows.length > 5000) {
    throw new Error(
      "Advanced Smart Cities filter matched more than 5000 anchor records. Narrow the filter.",
    );
  }

  return result.rows.map(
    (row) => row.id,
  );
}

async function expandPublicGraph(
  pool: Pool,
  registry: CompiledRegistryConfig,
  anchors: string[],
  depth = 2,
  anchorRecordTypeIds: string[] = [],
): Promise<Set<string>> {
  if (anchors.length === 0) {
    return new Set();
  }

  const statuses =
    publicStatuses(registry);

  const result = await pool.query<IdRow>(
    `WITH RECURSIVE reachable(
       id,
       depth,
       path
     ) AS (
       SELECT
         anchor.id,
         0,
         ARRAY[anchor.id]::text[]
       FROM unnest($3::text[])
         AS anchor(id)

       UNION ALL

       SELECT
         CASE
           WHEN relationship.from_record_id =
                reachable.id
           THEN relationship.to_record_id
           ELSE relationship.from_record_id
         END,
         reachable.depth + 1,
         reachable.path ||
           CASE
             WHEN relationship.from_record_id =
                  reachable.id
             THEN relationship.to_record_id
             ELSE relationship.from_record_id
           END
       FROM reachable
       INNER JOIN civic_registry_relationships
         AS relationship
         ON relationship.registry_id = $1
        AND (
          relationship.from_record_id =
            reachable.id
          OR relationship.to_record_id =
            reachable.id
        )
       INNER JOIN civic_registry_records
         AS target
         ON target.registry_id =
              relationship.registry_id
        AND target.id =
          CASE
            WHEN relationship.from_record_id =
                 reachable.id
            THEN relationship.to_record_id
            ELSE relationship.from_record_id
          END
       LEFT JOIN civic_registry_record_disclosures
         AS disclosure
         ON disclosure.registry_id =
              target.registry_id
        AND disclosure.record_id =
              target.id
       WHERE reachable.depth < $4
         AND target.visibility = 'public'
         AND (
           $2::text[] IS NULL
           OR target.status =
              ANY($2::text[])
         )
         AND COALESCE(
           disclosure.disposition,
           'disclosed'
         ) <> 'withheld'
         AND NOT (
           CASE
             WHEN relationship.from_record_id =
                  reachable.id
             THEN relationship.to_record_id
             ELSE relationship.from_record_id
           END = ANY(reachable.path)
         )
     )
     SELECT DISTINCT reachable.id
     FROM reachable
     INNER JOIN civic_registry_records
       AS final_record
       ON final_record.registry_id = $1
      AND final_record.id = reachable.id
     WHERE NOT (
       final_record.record_type_id =
         ANY($5::text[])
       AND NOT (
         reachable.id =
           ANY($3::text[])
       )
     )
     ORDER BY reachable.id
     LIMIT 5001`,
    [
      SMART_CITIES_REGISTRY_ID,
      statuses ?? null,
      anchors,
      depth,
      anchorRecordTypeIds,
    ],
  );

  if (result.rows.length > 5000) {
    throw new Error(
      "Advanced Smart Cities graph filter matched more than 5000 records. Narrow the filter.",
    );
  }

  return new Set(
    result.rows.map(
      (row) => row.id,
    ),
  );
}

function intersect(
  left: Set<string> | undefined,
  right: Set<string>,
): Set<string> {
  if (!left) {
    return new Set(right);
  }

  return new Set(
    [...left].filter((id) =>
      right.has(id),
    ),
  );
}

async function expandedFieldFilter(
  pool: Pool,
  registry: CompiledRegistryConfig,
  whereSql: string,
  values: unknown[],
  depth = 2,
  anchorRecordTypeIds: string[] = [],
): Promise<Set<string>> {
  const anchors = await anchorIds(
    pool,
    registry,
    whereSql,
    values,
  );

  return expandPublicGraph(
    pool,
    registry,
    anchors,
    depth,
    anchorRecordTypeIds,
  );
}

export async function resolveSmartCitiesCandidateRecordIds(
  pool: Pool,
  registry: CompiledRegistryConfig,
  filters: SmartCitiesAdvancedFilters,
): Promise<string[] | undefined> {
  if (
    registry.definition.id !==
      SMART_CITIES_REGISTRY_ID ||
    !hasSmartCitiesAdvancedFilters(
      filters,
    )
  ) {
    return undefined;
  }

  const sets: Array<Promise<Set<string>>> =
    [];

  if (filters.jurisdiction) {
    sets.push(
      expandedFieldFilter(
        pool,
        registry,
        `record.record_type_id IN (
           'deployment',
           'agency'
         )
         AND record.public_fields
           ->> 'jurisdiction' = $1`,
        [filters.jurisdiction],
        2,
        ["deployment", "agency"],
      ),
    );
  }

  if (filters.agencyId) {
    sets.push(
      expandPublicGraph(
        pool,
        registry,
        [filters.agencyId],
        2,
        ["agency"],
      ),
    );
  }

  if (filters.vendorId) {
    sets.push(
      expandPublicGraph(
        pool,
        registry,
        [filters.vendorId],
        2,
        ["vendor"],
      ),
    );
  }

  if (filters.technologyCategory) {
    sets.push(
      expandedFieldFilter(
        pool,
        registry,
        `record.record_type_id =
           'technology'
         AND record.public_fields
           ->> 'category' = $1`,
        [filters.technologyCategory],
        2,
        ["technology"],
      ),
    );
  }

  if (filters.deploymentStatus) {
    sets.push(
      expandedFieldFilter(
        pool,
        registry,
        `record.record_type_id =
           'deployment'
         AND record.public_fields
           ->> 'deployment_status' = $1`,
        [filters.deploymentStatus],
        2,
        ["deployment"],
      ),
    );
  }

  if (filters.dataCategory) {
    sets.push(
      expandedFieldFilter(
        pool,
        registry,
        `record.record_type_id IN (
           'deployment',
           'technology',
           'data_sharing'
         )
         AND EXISTS (
           SELECT 1
           FROM jsonb_array_elements_text(
             CASE
               WHEN jsonb_typeof(
                 record.public_fields
                   -> 'data_categories'
               ) = 'array'
               THEN record.public_fields
                 -> 'data_categories'
               ELSE '[]'::jsonb
             END
           ) AS item(value)
           WHERE item.value = $1
         )`,
        [filters.dataCategory],
        2,
        [
          "deployment",
          "technology",
          "data_sharing",
        ],
      ),
    );
  }

  if (
    filters.retentionMin !== undefined ||
    filters.retentionMax !== undefined
  ) {
    const clauses = [
      `record.record_type_id =
       'deployment'`,
      `NULLIF(
         record.public_fields
           ->> 'retention_days',
         ''
       ) IS NOT NULL`,
    ];
    const values: unknown[] = [];

    if (
      filters.retentionMin !== undefined
    ) {
      values.push(filters.retentionMin);
      clauses.push(
        `(
          record.public_fields
            ->> 'retention_days'
        )::numeric >= $${values.length}`,
      );
    }

    if (
      filters.retentionMax !== undefined
    ) {
      values.push(filters.retentionMax);
      clauses.push(
        `(
          record.public_fields
            ->> 'retention_days'
        )::numeric <= $${values.length}`,
      );
    }

    sets.push(
      expandedFieldFilter(
        pool,
        registry,
        clauses.join(" AND "),
        values,
        2,
        ["deployment"],
      ),
    );
  }

  if (filters.legalProcess) {
    sets.push(
      expandedFieldFilter(
        pool,
        registry,
        `record.record_type_id =
           'deployment'
         AND record.public_fields
           ->> 'legal_process_requirement'
             = $1`,
        [filters.legalProcess],
        2,
        ["deployment"],
      ),
    );
  }

  if (filters.policyStatus) {
    sets.push(
      expandedFieldFilter(
        pool,
        registry,
        `record.record_type_id =
           'policy'
         AND record.public_fields
           ->> 'policy_status' = $1`,
        [filters.policyStatus],
        2,
        ["policy"],
      ),
    );
  }

  if (filters.auditStatus) {
    sets.push(
      expandedFieldFilter(
        pool,
        registry,
        `record.record_type_id =
           'audit'
         AND record.public_fields
           ->> 'overall_status' = $1`,
        [filters.auditStatus],
        2,
        ["audit"],
      ),
    );
  }

  if (filters.incidentStatus) {
    sets.push(
      expandedFieldFilter(
        pool,
        registry,
        `record.record_type_id =
           'violation'
         AND record.public_fields
           ->> 'incident_status' = $1`,
        [filters.incidentStatus],
        2,
        ["violation"],
      ),
    );
  }

  const resolved =
    await Promise.all(sets);
  let candidates:
    | Set<string>
    | undefined;

  for (const set of resolved) {
    candidates = intersect(
      candidates,
      set,
    );

    if (candidates.size === 0) {
      return [];
    }
  }

  return candidates
    ? [...candidates].sort()
    : undefined;
}

export async function loadSmartCitiesAdvancedFilterOptions(
  pool: Pool,
  registry: CompiledRegistryConfig,
): Promise<SmartCitiesAdvancedFilterOptions> {
  const statuses =
    publicStatuses(registry);

  const baseValues = [
    SMART_CITIES_REGISTRY_ID,
    statuses ?? null,
  ];

  const [
    jurisdictions,
    agencies,
    vendors,
  ] = await Promise.all([
    pool.query<OptionRow>(
      `SELECT DISTINCT
         record.public_fields
           ->> 'jurisdiction'
           AS value,
         record.public_fields
           ->> 'jurisdiction'
           AS label
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
         AND record.record_type_id IN (
           'deployment',
           'agency'
         )
         AND COALESCE(
           disclosure.disposition,
           'disclosed'
         ) <> 'withheld'
         AND NULLIF(
           record.public_fields
             ->> 'jurisdiction',
           ''
         ) IS NOT NULL
       ORDER BY label`,
      baseValues,
    ),
    pool.query<OptionRow>(
      `SELECT
         record.id AS value,
         record.public_fields
           ->> 'name' AS label
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
              'agency'
         AND COALESCE(
           disclosure.disposition,
           'disclosed'
         ) <> 'withheld'
         AND NULLIF(
           record.public_fields
             ->> 'name',
           ''
         ) IS NOT NULL
       ORDER BY label`,
      baseValues,
    ),
    pool.query<OptionRow>(
      `SELECT
         record.id AS value,
         record.public_fields
           ->> 'name' AS label
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
              'vendor'
         AND COALESCE(
           disclosure.disposition,
           'disclosed'
         ) <> 'withheld'
         AND NULLIF(
           record.public_fields
             ->> 'name',
           ''
         ) IS NOT NULL
       ORDER BY label`,
      baseValues,
    ),
  ]);

  return {
    jurisdictions:
      jurisdictions.rows,
    agencies: agencies.rows,
    vendors: vendors.rows,
  };
}
