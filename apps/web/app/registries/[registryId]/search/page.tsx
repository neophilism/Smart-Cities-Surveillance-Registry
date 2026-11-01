import type { Metadata } from "next";
import { normalizeSearchRequest, SearchValidationError, type SearchResponse } from "@civic-registry/search";
import { notFound, redirect } from "next/navigation";
import { presentRecordSummary } from "@civic-registry/registry";

import { Breadcrumbs } from "../../../../components/breadcrumbs";
import { Pagination } from "../../../../components/pagination";
import { RecordCard } from "../../../../components/record-card";
import { SearchControls } from "../../../../components/search-controls";
import { SmartCitiesAdvancedFilterFields } from "../../../../components/smart-cities-advanced-filter-fields";
import {
  getPublicRegistry,
  searchPublicRecords,
} from "../../../../lib/public-registry";
import { getDatabasePool } from "../../../../lib/database";
import { searchResultRange } from "../../../../lib/pagination";
import {
  loadSmartCitiesAdvancedFilterOptions,
  parseSmartCitiesAdvancedFilters,
  resolveSmartCitiesCandidateRecordIds,
} from "../../../../lib/smart-cities-search";
import {
  SMART_CITIES_REGISTRY_ID,
} from "../../../../lib/smart-cities-public-safety";
import {
  firstSearchValue,
  parsePublicSearchRequest,
  type PublicSearchParams,
} from "../../../../lib/search-params";

export const dynamic = "force-dynamic";

interface SearchPageProps {
  params: Promise<{
    registryId: string;
  }>;
  searchParams: Promise<PublicSearchParams>;
}

export async function generateMetadata({
  params,
}: SearchPageProps): Promise<Metadata> {
  const { registryId } = await params;
  const registry = await getPublicRegistry(registryId);

  return {
    title: registry
      ? `Search — ${registry.config.definition.name}`
      : "Registry not found",
  };
}

export default async function RegistrySearchPage({
  params,
  searchParams,
}: SearchPageProps) {
  const { registryId } = await params;
  const query = await searchParams;
  const registry = await getPublicRegistry(registryId);

  if (!registry) notFound();

  const selectedTypeId = firstSearchValue(query.type);
  const recordType = selectedTypeId
    ? registry.config.recordTypesById.get(selectedTypeId)
    : undefined;

  if (selectedTypeId && !recordType) {
    redirect(
      `/registries/${encodeURIComponent(registryId)}/search`,
    );
  }

  const request = parsePublicSearchRequest(
    registry.config,
    query,
  );
  const advancedFilters =
    parseSmartCitiesAdvancedFilters(
      query,
    );
  const smartCities =
    registry.config.definition.id ===
    SMART_CITIES_REGISTRY_ID;
  const pool = getDatabasePool();
  let result: SearchResponse | undefined;
  let validationIssues: string[] = [];
  let advancedFilterOptions: Awaited<ReturnType<typeof loadSmartCitiesAdvancedFilterOptions>> | undefined;
  try {
    // Reject invalid ranges/sorts before launching advanced-filter database work.
    normalizeSearchRequest(registry.config, request);
    const [candidateRecordIds, options] = smartCities
      ? await Promise.all([
          resolveSmartCitiesCandidateRecordIds(pool, registry.config, advancedFilters),
          loadSmartCitiesAdvancedFilterOptions(pool, registry.config),
        ])
      : [undefined, undefined];
    advancedFilterOptions = options;
    if (candidateRecordIds !== undefined) request.recordIds = candidateRecordIds;
    result = await searchPublicRecords(registry.config, request);
  } catch (error) {
    if (!(error instanceof SearchValidationError)) throw error;
    validationIssues = error.issues.map((issue) => issue.message);
    // Keep advanced controls available for correction without running the invalid search.
    advancedFilterOptions = smartCities
      ? await loadSmartCitiesAdvancedFilterOptions(pool, registry.config)
      : undefined;
  }
  const presented = (result?.hits ?? []).map(({ record }) =>
    presentRecordSummary(record, registry.config),
  );
  const basePath = `/registries/${encodeURIComponent(
    registryId,
  )}/search`;

  return (
    <main className="page-shell">
      <Breadcrumbs
        items={[
          { label: "Registries", href: "/" },
          {
            label: registry.config.definition.name,
            href: `/registries/${encodeURIComponent(registryId)}`,
          },
          { label: "Search" },
        ]}
      />

      <header className="page-heading page-heading--compact">
        <p className="eyebrow">Registry-wide discovery</p>
        <h1>Search {registry.config.definition.name}</h1>
        <p className="lede">
          Search all public record types together, or narrow the
          query to a configured type to unlock its field-specific
          filters.
        </p>
      </header>

      <section
        className="section-block section-block--search"
        aria-labelledby="registry-search-heading"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">Discovery</p>
            <h2 id="registry-search-heading">
              Search and filter
            </h2>
          </div>
        </div>

        {validationIssues.length > 0 ? (
          <div className="admin-message admin-message--error" role="alert" id="search-validation">
            <h3>Review your search filters</h3>
            <ul>{validationIssues.map((issue, index) => <li key={index}>{issue}</li>)}</ul>
            <p>Your filters are preserved below. Correct them and select Search or Apply filters.</p>
            <a href="#registry-search-query">Return to the search controls</a>
          </div>
        ) : null}
        <SearchControls
          registry={registry.config}
          recordType={recordType}
          facets={result?.facets ?? { recordTypes: [], statuses: [], tags: [], fields: {} }}
          validationMessageId={validationIssues.length > 0 ? "search-validation" : undefined}
          params={query}
          action={basePath}
          includeRecordType
          extraFilters={
            advancedFilterOptions ? (
              <SmartCitiesAdvancedFilterFields
                registry={registry.config}
                params={query}
                options={
                  advancedFilterOptions
                }
              />
            ) : undefined
          }
        />
      </section>

      {result ? (<section
        className="section-block"
        aria-labelledby="search-results-heading"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">Results</p>
            <h2 id="search-results-heading" tabIndex={-1}>
              {result.total}{" "}
              {result.total === 1 ? "record" : "records"}
            </h2>
            <p role="status" aria-live="polite" aria-atomic="true">
              {searchResultRange(result.total, result.page, result.pageSize)}
            </p>
          </div>
        </div>

        {presented.length > 0 ? (
          <>
            <div className="record-list">
              {presented.map((record) => (
                <RecordCard
                  key={record.id}
                  record={record}
                />
              ))}
            </div>
            <Pagination
              resultsId="search-results-heading"
              basePath={basePath}
              params={query}
              page={result.page}
              pageSize={result.pageSize}
              total={result.total}
            />
          </>
        ) : (
          <div className="empty-state empty-state--inline" role="status">
            <h3>No matching public records</h3>
            <p>
              Try a broader query or remove one of the selected
              filters.
            </p>
          </div>
        )}
      </section>) : null}
    </main>
  );
}
