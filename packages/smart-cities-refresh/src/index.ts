import {
  PostgresIngestionService,
  PostgresSourceRefreshService,
  type RunDueSourceRefreshResult,
  type SourceRefreshClaim,
  type SourceRefreshJobDefinition,
} from "@civic-registry/database";
import { type RecordIngestionProfile } from "@civic-registry/ingestion";
import {
  runSourceAdapter,
  type SourceAdapter,
} from "@civic-registry/source-adapters";
import {
  createArcGisFeatureServerAdapter,
  createCkanAdapter,
  createHtmlDocumentCatalogAdapter,
  createProcurementExportAdapter,
  createSocrataAdapter,
  type ArcGisFeatureServerAdapterConfig,
  type CkanAdapterConfig,
  type HtmlDocumentCatalogAdapterConfig,
  type ProcurementExportAdapterConfig,
  type SocrataAdapterConfig,
} from "@smart-cities-surveillance-registry/source-adapters";
import type { Pool } from "pg";

export const SMART_CITIES_REGISTRY_ID = "smart-cities-surveillance-registry";

export type ApprovedAdapter =
  | { kind: "socrata"; settings: SocrataAdapterConfig }
  | { kind: "arcgis"; settings: ArcGisFeatureServerAdapterConfig }
  | { kind: "ckan"; settings: CkanAdapterConfig }
  | { kind: "procurement"; settings: ProcurementExportAdapterConfig }
  | { kind: "html-catalog"; settings: HtmlDocumentCatalogAdapterConfig };

export interface ApprovedOfficialSource {
  id: string;
  enabled: boolean;
  adapter: ApprovedAdapter;
  ingestionProfile: RecordIngestionProfile;
  refresh: Pick<
    SourceRefreshJobDefinition,
    | "intervalSeconds"
    | "staleAfterSeconds"
    | "failureBackoffBaseSeconds"
    | "failureBackoffMaxSeconds"
    | "emptyResultBehavior"
    | "rowCountDropWarningPercent"
    | "adapterOptions"
  >;
}

export interface OfficialSourceCatalog {
  schemaVersion: 1;
  registryId: string;
  sources: ApprovedOfficialSource[];
}

export function createOfficialAdapter(definition: ApprovedAdapter): SourceAdapter {
  switch (definition.kind) {
    case "socrata":
      return createSocrataAdapter(definition.settings);
    case "arcgis":
      return createArcGisFeatureServerAdapter(definition.settings);
    case "ckan":
      return createCkanAdapter(definition.settings);
    case "procurement":
      return createProcurementExportAdapter(definition.settings);
    case "html-catalog":
      return createHtmlDocumentCatalogAdapter(definition.settings);
    default:
      throw new Error("Unrecognized official source adapter type.");
  }
}

export function validateOfficialSourceCatalog(value: unknown): OfficialSourceCatalog {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Official source catalog must be an object.");
  }
  const catalog = value as OfficialSourceCatalog;
  if (
    catalog.schemaVersion !== 1 ||
    catalog.registryId !== SMART_CITIES_REGISTRY_ID ||
    !Array.isArray(catalog.sources)
  ) {
    throw new Error("Invalid Smart Cities source catalog version or registry ID.");
  }
  const ids = new Set<string>();
  for (const source of catalog.sources) {
    if (
      !source || typeof source !== "object" ||
      typeof source.id !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(source.id) ||
      typeof source.enabled !== "boolean" ||
      !source.adapter?.settings || !source.ingestionProfile || !source.refresh
    ) {
      throw new Error("An approved official source has invalid required fields.");
    }
    if (ids.has(source.id)) {
      throw new Error("Duplicate official source ID: " + source.id);
    }
    ids.add(source.id);
    const status = source.ingestionProfile.status;
    if (
      source.ingestionProfile.mode !== "upsert" ||
      !status || !("literal" in status) || status.literal !== "draft" ||
      source.ingestionProfile.allowLifecycleBootstrap === true ||
      !source.ingestionProfile.id ||
      !source.ingestionProfile.recordId
    ) {
      throw new Error("Official sources must use upsert and a draft-only, review-first profile.");
    }
    const adapter = createOfficialAdapter(source.adapter);
    if (
      source.adapter.settings.id !== source.id ||
      !Array.isArray(adapter.allowedHosts) ||
      adapter.allowedHosts.length === 0 ||
      adapter.defaultStartUrls.length === 0
    ) {
      throw new Error("Official source adapter identity, hosts, or start URLs are missing.");
    }
    for (const host of adapter.allowedHosts) {
      if (!host || host.toLowerCase() !== host || host.includes("/") || host.includes(":")) {
        throw new Error("Official source allowlist contains an invalid hostname.");
      }
    }
    for (const address of adapter.defaultStartUrls) {
      let url: URL;
      try {
        url = new URL(address);
      } catch {
        throw new Error("Official source has an invalid start URL.");
      }
      if (
        url.protocol !== "https:" ||
        url.username || url.password || url.port ||
        !adapter.allowedHosts.includes(url.hostname.toLowerCase())
      ) {
        throw new Error("Official source URL must use HTTPS on an explicitly approved host.");
      }
    }
    if (
      !Number.isInteger(source.refresh.intervalSeconds) ||
      source.refresh.intervalSeconds < 300 ||
      !Number.isInteger(source.refresh.staleAfterSeconds) ||
      source.refresh.staleAfterSeconds < source.refresh.intervalSeconds
    ) {
      throw new Error("Official source refresh cadence and stale threshold are invalid.");
    }
  }
  return catalog;
}

/**
 * Consume only source profiles explicitly committed and enabled in the
 * catalog. Leases, retries, backoff, health, and ingestion provenance are
 * supplied by the generic Civic Registry engine.
 */
export async function runConfiguredSourceRefresh(
  pool: Pool,
  rawCatalog: unknown,
  options: { limit?: number; now?: string } = {},
): Promise<RunDueSourceRefreshResult> {
  const catalog = validateOfficialSourceCatalog(rawCatalog);
  const sources = new Map<
    string,
    { adapter: SourceAdapter; profile: RecordIngestionProfile }
  >();
  const definitions: SourceRefreshJobDefinition[] = [];

  for (const source of catalog.sources) {
    if (!source.enabled) continue;
    const adapter = createOfficialAdapter(source.adapter);
    sources.set(source.id, { adapter, profile: source.ingestionProfile });
    definitions.push({
      ...source.refresh,
      id: source.id,
      registryId: catalog.registryId,
      label: adapter.label,
      adapterId: adapter.id,
      profileId: source.ingestionProfile.id,
      enabled: true,
      intervalSeconds: source.refresh.intervalSeconds,
      staleAfterSeconds: source.refresh.staleAfterSeconds,
    });
  }

  const refresh = new PostgresSourceRefreshService(pool);
  const ingestion = new PostgresIngestionService(pool);
  const synchronized = await refresh.syncDefinitions(
    catalog.registryId,
    definitions,
    { disableMissing: true, now: options.now },
  );
  for (const job of synchronized) {
    if (sources.has(job.id) && !job.enabled) {
      await refresh.setEnabled(catalog.registryId, job.id, true, options.now);
    }
  }

  return refresh.runDue({
    registryId: catalog.registryId,
    limit: options.limit,
    now: options.now,
    executor: async (claim: SourceRefreshClaim) => {
      const source = sources.get(claim.job.id);
      if (
        !source ||
        source.adapter.id !== claim.job.adapterId ||
        source.profile.id !== claim.job.profileId
      ) {
        throw new Error("Unknown or inconsistent approved official source job.");
      }
      const { output, manifest } = await runSourceAdapter(
        source.adapter,
        claim.job.adapterOptions,
      );
      const imported = await ingestion.run({
        registryId: catalog.registryId,
        profile: source.profile,
        format: "ndjson",
        input: output,
        sourceLabel: source.adapter.label,
        sourceUri: source.adapter.defaultStartUrls[0],
        actorId: "system:smart-cities-source-refresh",
        reason: "Approved official-source collection into reviewable draft records.",
        metadata: {
          sourceRefreshJobId: claim.job.id,
          sourceRefreshRunId: claim.run.id,
        },
      });
      return {
        manifest,
        ingestionRunId: imported.run.id,
        ingestionStatus: imported.run.status,
        ingestionFailedItems: imported.run.failedItems,
      };
    },
  });
}

export { projectSourceFreshness } from "./freshness.ts";
export type { SourceFreshnessInput, SourceFreshness, FreshnessStatus } from "./freshness.ts";
