import {
  decodeIngestionInput,
  type IngestionFormat,
} from "@civic-registry/ingestion";
import type {
  SourceAdapter,
  SourceAdapterCollection,
  SourceAdapterRunOptions,
} from "@civic-registry/source-adapters";

import {
  mapProviderObject,
  type ProviderRowMapping,
} from "./common.ts";

export interface ProcurementExportAdapterConfig {
  id: string;
  label: string;
  allowedHosts: string[];
  url: string;
  format: IngestionFormat;
  mapping: ProviderRowMapping;
  csvDelimiter?: string;
}

export function createProcurementExportAdapter(
  config: ProcurementExportAdapterConfig,
): SourceAdapter {
  return {
    id: config.id,
    label: config.label,
    allowedHosts: config.allowedHosts,
    defaultStartUrls: [config.url],

    async collect(
      client,
      options: SourceAdapterRunOptions = {},
    ): Promise<SourceAdapterCollection> {
      const retrievedAt =
        options.retrievedAt ??
        new Date().toISOString();
      const sourceUrl =
        options.startUrls?.[0] ??
        config.url;
      const fetched =
        await client.fetchBytes(
          sourceUrl,
          config.allowedHosts,
        );
      const input =
        new TextDecoder("utf-8", {
          fatal: false,
        }).decode(fetched.body);
      const decoded =
        decodeIngestionInput(
          input,
          config.format,
          {
            csvDelimiter:
              config.csvDelimiter,
          },
        );
      const warnings =
        decoded.issues.map(
          (issue) => ({
            code:
              "procurement_export_" +
              issue.code,
            message:
              issue.message,
            url: fetched.finalUrl,
          }),
        );
      const maxItems =
        options.maxItems ??
        10_000;
      const rows = [];

      for (
        const decodedRow of
        decoded.rows
      ) {
        const row =
          mapProviderObject(
            decodedRow.value,
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
              "procurement_export_row_missing_identity",
            message:
              "Skipped an export row missing the configured record id or title.",
            url: fetched.finalUrl,
          });
          continue;
        }

        rows.push(row);

        if (
          rows.length >= maxItems
        ) {
          break;
        }
      }

      return {
        rows,
        sourcePages: [
          fetched.finalUrl,
        ],
        warnings,
      };
    },
  };
}
