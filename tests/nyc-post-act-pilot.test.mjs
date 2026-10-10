import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createOfficialAdapter,
  validateOfficialSourceCatalog,
} from "../packages/smart-cities-refresh/src/index.ts";

const raw = JSON.parse(await readFile("config/official-sources.json", "utf8"));
const catalog = validateOfficialSourceCatalog(raw);
const source = catalog.sources.find((entry) => entry.id === "nypd-post-act-impact-use-policies");

test("NYPD POST Act pilot is verified-domain and disabled by default", () => {
  assert.ok(source, "NYPD official source profile must exist");
  assert.equal(source.enabled, false);
  assert.deepEqual(source.adapter.settings.allowedHosts, ["www.nyc.gov"]);
  assert.equal(source.adapter.kind, "html-catalog");
  assert.ok(source.adapter.settings.startUrls[0].startsWith("https://www.nyc.gov/"));
  assert.equal(source.ingestionProfile.mode, "upsert");
  assert.deepEqual(source.ingestionProfile.status, { literal: "draft" });
  assert.ok(source.ingestionProfile.externalIdentifiers.some(
    (entry) => entry.scheme === "official-record",
  ));
});

test("NYPD PDF anchors with generic link text retain informative official titles", async () => {
  const adapter = createOfficialAdapter(source.adapter);
  const page = source.adapter.settings.startUrls[0];
  const client = {
    async fetchText(url) {
      assert.equal(url, page);
      return {
        requestedUrl: url,
        finalUrl: url,
        contentType: "text/html",
        fetchedAt: "2026-10-09T00:00:00.000Z",
        body: `<html><body>
          <a href="/assets/nypd/downloads/pdf/post-final/License-Plate-Readers-NYPD-Impact-and-Use-Policy-2.4.26-FINAL.pdf">PDF</a>
          <a href="/assets/nypd/downloads/pdf/post-final/Audio-Only-Recording-Devices-Overt.pdf">PDF</a>
          <a href="https://unapproved.example/files/private.pdf">PDF</a>
        </body></html>`,
      };
    },
    async fetchJson() { throw new Error("unexpected JSON"); },
    async fetchBytes() { throw new Error("unexpected download"); },
  };
  const result = await adapter.collect(client, { maxItems: 50, maxPages: 1 });
  assert.equal(result.rows.length, 2);
  assert.match(result.rows[0].title, /License Plate Readers NYPD/);
  assert.match(result.rows[1].title, /Audio Only Recording Devices Overt/);
  assert.equal(result.rows[0].source_adapter, source.id);
  assert.equal(result.warnings[0].code, "html_catalog_external_document");
});
