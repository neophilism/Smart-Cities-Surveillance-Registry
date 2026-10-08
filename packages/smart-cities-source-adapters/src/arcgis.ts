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

export interface ArcGisFeatureServerAdapterConfig {
  id: string;
  label: string;
  allowedHosts: string[];
  layerUrl: string;
  mapping: ProviderRowMapping;
  pageSize?: number;
  where?: string;
  outFields?: string[];
}

export function createArcGisFeatureServerAdapter(
  config: ArcGisFeatureServerAdapterConfig,
): SourceAdapter {
  const endpoint =
    config.layerUrl.replace(/\/$/, "") +
    "/query";

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
          2_000,
          config.pageSize ?? 500,
        ),
      );
      const maxItems =
        options.maxItems ?? 10_000;
      const maxPages =
        options.maxPages ?? 50;
      const queryEndpoint =
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
          new URL(queryEndpoint);
        url.searchParams.set(
          "where",
          config.where ?? "1=1",
        );
        url.searchParams.set(
          "outFields",
          (
            config.outFields ??
            ["*"]
          ).join(","),
        );
        url.searchParams.set(
          "returnGeometry",
          "false",
        );
        url.searchParams.set(
          "f",
          "json",
        );
        url.searchParams.set(
          "resultOffset",
          String(page * pageSize),
        );
        url.searchParams.set(
          "resultRecordCount",
          String(
            Math.min(
              pageSize,
              maxItems - rows.length,
            ),
          ),
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

        if (!root) {
          throw new Error(
            config.label +
              " expected an ArcGIS object response.",
          );
        }

        if (root.error) {
          throw new Error(
            config.label +
              " returned an ArcGIS error: " +
              JSON.stringify(root.error),
          );
        }

        const features =
          Array.isArray(root.features)
            ? root.features
            : [];

        for (const feature of features) {
          const featureObject =
            objectValue(feature);
          const attributes =
            featureObject
              ? objectValue(
                  featureObject.attributes,
                )
              : undefined;

          if (!attributes) {
            warnings.push({
              code:
                "arcgis_feature_missing_attributes",
              message:
                "Skipped an ArcGIS feature without attributes.",
              url: fetched.finalUrl,
            });
            continue;
          }

          const row =
            mapProviderObject(
              attributes,
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
                "arcgis_feature_missing_identity",
              message:
                "Skipped an ArcGIS feature missing the configured record id or title.",
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

        const more =
          root.exceededTransferLimit ===
            true ||
          features.length === pageSize;

        if (
          features.length === 0 ||
          !more
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
