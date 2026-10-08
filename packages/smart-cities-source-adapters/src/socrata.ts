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

export interface SocrataAdapterConfig {
  id: string;
  label: string;
  allowedHosts: string[];
  endpoint: string;
  mapping: ProviderRowMapping;
  pageSize?: number;
  orderBy?: string;
}

export function createSocrataAdapter(
  config: SocrataAdapterConfig,
): SourceAdapter {
  return {
    id: config.id,
    label: config.label,
    allowedHosts: config.allowedHosts,
    defaultStartUrls: [config.endpoint],

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
          50_000,
          config.pageSize ?? 1_000,
        ),
      );
      const maxItems =
        options.maxItems ?? 10_000;
      const maxPages =
        options.maxPages ?? 25;
      const endpoint =
        options.startUrls?.[0] ??
        config.endpoint;
      const rows = [];
      const sourcePages: string[] = [];
      const warnings = [];

      for (
        let page = 0;
        page < maxPages &&
        rows.length < maxItems;
        page += 1
      ) {
        const url = new URL(endpoint);
        url.searchParams.set(
          "$limit",
          String(
            Math.min(
              pageSize,
              maxItems - rows.length,
            ),
          ),
        );
        url.searchParams.set(
          "$offset",
          String(page * pageSize),
        );

        if (config.orderBy) {
          url.searchParams.set(
            "$order",
            config.orderBy,
          );
        }

        const fetched =
          await client.fetchJson(
            url.toString(),
            config.allowedHosts,
          );
        sourcePages.push(
          fetched.finalUrl,
        );

        const parsed = parseJson(
          fetched.body,
          config.label,
        );

        if (!Array.isArray(parsed)) {
          throw new Error(
            config.label +
              " expected a Socrata array response.",
          );
        }

        let accepted = 0;

        for (const item of parsed) {
          const object =
            objectValue(item);

          if (!object) {
            warnings.push({
              code:
                "socrata_row_not_object",
              message:
                "Skipped a Socrata row that was not an object.",
              url: fetched.finalUrl,
            });
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
                "socrata_row_missing_identity",
              message:
                "Skipped a Socrata row missing the configured record id or title.",
              url: fetched.finalUrl,
            });
            continue;
          }

          rows.push(row);
          accepted += 1;

          if (
            rows.length >= maxItems
          ) {
            break;
          }
        }

        if (
          parsed.length < pageSize ||
          parsed.length === 0
        ) {
          break;
        }

        if (
          accepted === 0 &&
          parsed.length > 0
        ) {
          warnings.push({
            code:
              "socrata_page_no_accepted_rows",
            message:
              "A Socrata page contained no rows matching the configured identity mapping.",
            url: fetched.finalUrl,
          });
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
