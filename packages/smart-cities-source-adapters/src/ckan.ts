import type {
  SourceAdapter,
  SourceAdapterCollection,
  SourceAdapterRunOptions,
} from "@civic-registry/source-adapters";

import {
  mapProviderObject,
  objectValue,
  parseJson,
  type ProviderRowMapping,
} from "./common.ts";

export interface CkanAdapterConfig {
  id: string;
  label: string;
  allowedHosts: string[];
  baseUrl: string;
  query: string;
  mapping: ProviderRowMapping;
  pageSize?: number;
}

function resourceUrls(
  value: unknown,
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap(
    (resource) => {
      const object =
        objectValue(resource);
      const url =
        object?.url;

      return typeof url === "string" &&
        url.trim()
        ? [url.trim()]
        : [];
    },
  );
}

export function createCkanAdapter(
  config: CkanAdapterConfig,
): SourceAdapter {
  const endpoint =
    config.baseUrl.replace(/\/$/, "") +
    "/api/3/action/package_search";

  return {
    id: config.id,
    label: config.label,
    allowedHosts: config.allowedHosts,
    defaultStartUrls: [endpoint],

    async collect(
      client,
      options: SourceAdapterRunOptions = {},
    ): Promise<SourceAdapterCollection> {
      const retrievedAt =
        options.retrievedAt ??
        new Date().toISOString();
      const pageSize = Math.max(
        1,
        Math.min(
          1_000,
          config.pageSize ?? 100,
        ),
      );
      const maxItems =
        options.maxItems ?? 10_000;
      const maxPages =
        options.maxPages ?? 100;
      const searchEndpoint =
        options.startUrls?.[0] ??
        endpoint;
      const rows = [];
      const sourcePages: string[] = [];
      const warnings = [];

      for (
        let page = 0;
        page < maxPages &&
        rows.length < maxItems;
        page += 1
      ) {
        const url =
          new URL(searchEndpoint);
        url.searchParams.set(
          "q",
          config.query,
        );
        url.searchParams.set(
          "rows",
          String(
            Math.min(
              pageSize,
              maxItems - rows.length,
            ),
          ),
        );
        url.searchParams.set(
          "start",
          String(page * pageSize),
        );

        const fetched =
          await client.fetchJson(
            url.toString(),
            config.allowedHosts,
          );
        sourcePages.push(
          fetched.finalUrl,
        );

        const root = objectValue(
          parseJson(
            fetched.body,
            config.label,
          ),
        );
        const result =
          root
            ? objectValue(root.result)
            : undefined;

        if (
          !root ||
          root.success !== true ||
          !result
        ) {
          throw new Error(
            config.label +
              " expected a successful CKAN package_search response.",
          );
        }

        const packages =
          Array.isArray(
            result.results,
          )
            ? result.results
            : [];

        for (const item of packages) {
          const object =
            objectValue(item);

          if (!object) {
            continue;
          }

          const row =
            mapProviderObject(
              object,
              config.mapping,
              {
                adapterId: config.id,
                retrievedAt,
                sourceUrl:
                  fetched.finalUrl,
              },
            );

          if (!row) {
            warnings.push({
              code:
                "ckan_package_missing_identity",
              message:
                "Skipped a CKAN package missing the configured record id or title.",
              url: fetched.finalUrl,
            });
            continue;
          }

          const attachments =
            resourceUrls(
              object.resources,
            );

          if (
            attachments.length > 0
          ) {
            row.attachment_urls =
              attachments;
          }

          rows.push(row);

          if (
            rows.length >= maxItems
          ) {
            break;
          }
        }

        const total =
          typeof result.count ===
          "number"
            ? result.count
            : Number(result.count);
        const consumed =
          page * pageSize +
          packages.length;

        if (
          packages.length === 0 ||
          packages.length < pageSize ||
          (
            Number.isFinite(total) &&
            consumed >= total
          )
        ) {
          break;
        }
      }

      return {
        rows,
        sourcePages,
        warnings,
      };
    },
  };
}
