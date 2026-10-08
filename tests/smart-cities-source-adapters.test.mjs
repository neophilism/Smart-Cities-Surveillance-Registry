import assert from "node:assert/strict";
import test from "node:test";

import {
  createArcGisFeatureServerAdapter,
  createCkanAdapter,
  createHtmlDocumentCatalogAdapter,
  createProcurementExportAdapter,
  createSocrataAdapter,
} from "../packages/smart-cities-source-adapters/src/index.ts";

const retrievedAt =
  "2026-10-08T04:00:00.000Z";

function jsonResult(
  url,
  body,
) {
  return {
    requestedUrl: url,
    finalUrl: url,
    contentType:
      "application/json",
    fetchedAt: retrievedAt,
    body: JSON.stringify(body),
  };
}

function textResult(
  url,
  body,
) {
  return {
    requestedUrl: url,
    finalUrl: url,
    contentType: "text/html",
    fetchedAt: retrievedAt,
    body,
  };
}

function bytesResult(
  url,
  body,
  contentType = "text/csv",
) {
  return {
    requestedUrl: url,
    finalUrl: url,
    contentType,
    fetchedAt: retrievedAt,
    body:
      new TextEncoder().encode(
        body,
      ),
  };
}

test("Socrata adapter paginates JSON rows and maps downstream fields", async () => {
  const calls = [];
  const client = {
    async fetchJson(url) {
      calls.push(url);
      const parsed = new URL(url);
      const offset = Number(
        parsed.searchParams.get(
          "$offset",
        ),
      );

      return jsonResult(
        url,
        offset === 0
          ? [
              {
                row_id: "101",
                title:
                  "Camera inventory item",
                jurisdiction:
                  "Example City",
                url:
                  "https://data.example.gov/items/101",
              },
              {
                row_id: "102",
                title:
                  "Second inventory item",
                jurisdiction:
                  "Example City",
                url:
                  "https://data.example.gov/items/102",
              },
            ]
          : [],
      );
    },
    async fetchText() {
      throw new Error(
        "unexpected fetchText",
      );
    },
    async fetchBytes() {
      throw new Error(
        "unexpected fetchBytes",
      );
    },
  };

  const adapter =
    createSocrataAdapter({
      id: "example-socrata",
      label:
        "Example Socrata dataset",
      allowedHosts: [
        "data.example.gov",
      ],
      endpoint:
        "https://data.example.gov/resource/abcd.json",
      pageSize: 2,
      mapping: {
        recordIdField: "row_id",
        titleField: "title",
        canonicalUrlField: "url",
        fieldMap: {
          jurisdiction:
            "jurisdiction",
        },
      },
    });

  const result =
    await adapter.collect(
      client,
      {
        retrievedAt,
        maxPages: 3,
      },
    );

  assert.equal(
    result.rows.length,
    2,
  );
  assert.equal(calls.length, 2);
  assert.equal(
    result.rows[0].jurisdiction,
    "Example City",
  );
  assert.equal(
    result.rows[0].canonical_url,
    "https://data.example.gov/items/101",
  );
});

test("ArcGIS FeatureServer adapter maps attributes and ignores geometry", async () => {
  const client = {
    async fetchJson(url) {
      return jsonResult(
        url,
        {
          features: [
            {
              attributes: {
                OBJECTID: 7,
                PROGRAM:
                  "Example Camera Program",
                JURISDICTION:
                  "Example City",
                URL:
                  "https://gis.example.gov/item/7",
              },
              geometry: {
                x: -77,
                y: 38,
              },
            },
          ],
          exceededTransferLimit:
            false,
        },
      );
    },
    async fetchText() {
      throw new Error(
        "unexpected fetchText",
      );
    },
    async fetchBytes() {
      throw new Error(
        "unexpected fetchBytes",
      );
    },
  };

  const adapter =
    createArcGisFeatureServerAdapter({
      id: "example-arcgis",
      label:
        "Example ArcGIS layer",
      allowedHosts: [
        "gis.example.gov",
      ],
      layerUrl:
        "https://gis.example.gov/arcgis/rest/services/Programs/FeatureServer/0",
      mapping: {
        recordIdField:
          "OBJECTID",
        titleField: "PROGRAM",
        canonicalUrlField: "URL",
        fieldMap: {
          jurisdiction:
            "JURISDICTION",
        },
      },
    });

  const result =
    await adapter.collect(
      client,
      {
        retrievedAt,
      },
    );

  assert.equal(
    result.rows.length,
    1,
  );
  assert.equal(
    result.rows[0].external_id,
    "7",
  );
  assert.equal(
    result.rows[0].jurisdiction,
    "Example City",
  );
  assert.ok(
    !Object.hasOwn(
      result.rows[0],
      "geometry",
    ),
  );
});

test("CKAN adapter collects datasets and public resource attachments", async () => {
  const client = {
    async fetchJson(url) {
      return jsonResult(
        url,
        {
          success: true,
          result: {
            count: 1,
            results: [
              {
                id: "dataset-1",
                title:
                  "Surveillance procurement records",
                notes:
                  "Synthetic CKAN dataset.",
                url:
                  "https://catalog.example.gov/dataset/dataset-1",
                resources: [
                  {
                    url:
                      "https://catalog.example.gov/files/contracts.csv",
                  },
                  {
                    url:
                      "https://catalog.example.gov/files/readme.pdf",
                  },
                ],
              },
            ],
          },
        },
      );
    },
    async fetchText() {
      throw new Error(
        "unexpected fetchText",
      );
    },
    async fetchBytes() {
      throw new Error(
        "unexpected fetchBytes",
      );
    },
  };

  const adapter =
    createCkanAdapter({
      id: "example-ckan",
      label:
        "Example CKAN catalog",
      allowedHosts: [
        "catalog.example.gov",
      ],
      baseUrl:
        "https://catalog.example.gov",
      query: "surveillance",
      mapping: {
        recordIdField: "id",
        titleField: "title",
        canonicalUrlField: "url",
        fieldMap: {
          summary: "notes",
        },
      },
    });

  const result =
    await adapter.collect(
      client,
      {
        retrievedAt,
      },
    );

  assert.equal(
    result.rows.length,
    1,
  );
  assert.equal(
    result.rows[0].summary,
    "Synthetic CKAN dataset.",
  );
  assert.deepEqual(
    result.rows[0]
      .attachment_urls,
    [
      "https://catalog.example.gov/files/contracts.csv",
      "https://catalog.example.gov/files/readme.pdf",
    ],
  );
});

test("procurement export adapter normalizes official CSV exports", async () => {
  const client = {
    async fetchBytes(url) {
      return bytesResult(
        url,
        [
          "contract_id,title,amount,status,url",
          "C-100,Example Camera Contract,125000,active,https://procurement.example.gov/contracts/C-100",
          "",
        ].join("\n"),
      );
    },
    async fetchText() {
      throw new Error(
        "unexpected fetchText",
      );
    },
    async fetchJson() {
      throw new Error(
        "unexpected fetchJson",
      );
    },
  };

  const adapter =
    createProcurementExportAdapter({
      id:
        "example-procurement-export",
      label:
        "Example procurement export",
      allowedHosts: [
        "procurement.example.gov",
      ],
      url:
        "https://procurement.example.gov/exports/contracts.csv",
      format: "csv",
      mapping: {
        recordIdField:
          "contract_id",
        titleField: "title",
        canonicalUrlField: "url",
        fieldMap: {
          amount: "amount",
          procurement_status:
            "status",
        },
      },
    });

  const result =
    await adapter.collect(
      client,
      {
        retrievedAt,
      },
    );

  assert.equal(
    result.rows.length,
    1,
  );
  assert.equal(
    result.rows[0].external_id,
    "C-100",
  );
  assert.equal(
    result.rows[0].amount,
    "125000",
  );
});

test("HTML document catalog adapter keeps only allowlisted public documents", async () => {
  const client = {
    async fetchText(url) {
      return textResult(
        url,
        `<!doctype html>
        <html>
          <body>
            <a href="/docs/use-policy.pdf">
              Surveillance use policy
            </a>
            <a href="https://catalog.example.gov/docs/contracts.csv">
              Contract export
            </a>
            <a href="https://outside.example/files/secret.pdf">
              External file
            </a>
            <a href="/about">
              About
            </a>
          </body>
        </html>`,
      );
    },
    async fetchJson() {
      throw new Error(
        "unexpected fetchJson",
      );
    },
    async fetchBytes() {
      throw new Error(
        "unexpected fetchBytes",
      );
    },
  };

  const adapter =
    createHtmlDocumentCatalogAdapter({
      id: "example-html-catalog",
      label:
        "Example document catalog",
      allowedHosts: [
        "catalog.example.gov",
      ],
      startUrls: [
        "https://catalog.example.gov/surveillance",
      ],
    });

  const result =
    await adapter.collect(
      client,
      {
        retrievedAt,
      },
    );

  assert.equal(
    result.rows.length,
    2,
  );
  assert.deepEqual(
    result.rows.map(
      (row) => row.title,
    ),
    [
      "Surveillance use policy",
      "Contract export",
    ],
  );
  assert.equal(
    result.warnings.length,
    1,
  );
  assert.equal(
    result.warnings[0].code,
    "html_catalog_external_document",
  );
});

test("provider adapters honor maxItems without publishing provider geometry or raw objects", async () => {
  const client = {
    async fetchJson(url) {
      return jsonResult(
        url,
        [
          {
            id: "1",
            title: "One",
            extra: {
              private:
                "not mapped",
            },
          },
          {
            id: "2",
            title: "Two",
          },
        ],
      );
    },
    async fetchText() {
      throw new Error(
        "unexpected fetchText",
      );
    },
    async fetchBytes() {
      throw new Error(
        "unexpected fetchBytes",
      );
    },
  };

  const adapter =
    createSocrataAdapter({
      id: "limited-socrata",
      label: "Limited Socrata",
      allowedHosts: [
        "data.example.gov",
      ],
      endpoint:
        "https://data.example.gov/resource/limited.json",
      pageSize: 100,
      mapping: {
        recordIdField: "id",
        titleField: "title",
      },
    });

  const result =
    await adapter.collect(
      client,
      {
        retrievedAt,
        maxItems: 1,
      },
    );

  assert.equal(
    result.rows.length,
    1,
  );
  assert.ok(
    !Object.hasOwn(
      result.rows[0],
      "extra",
    ),
  );
});
