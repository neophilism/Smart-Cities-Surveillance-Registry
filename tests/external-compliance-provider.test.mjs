import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchExternalClaims } from "../packages/smart-cities-compliance/src/index.ts";
const scope = { registryId: "city", recordId: "r1", providerId: "official" };
const claim = { ...scope, sourceId: "s1", sourceUrl: "https://city.example.gov/audit/1", observedAt: "2026-10-18T12:00:00Z", kind: "audit", assertion: "Review opened" };
function reply(body, status = 200, type = "application/json") { return new Response(JSON.stringify(body), { status, headers: { "content-type": type } }); }
test("versioned API fetch sends bearer request and deduplicates retries", async () => {
  let called = 0;
  const claims = await fetchExternalClaims({ endpoint: "https://api.example.gov/v1/claims", token: "test-token", scope,
    fetchImpl: async (url, options) => { called++; assert.equal(String(url), "https://api.example.gov/v1/claims"); assert.equal(options.headers.authorization, "Bearer test-token"); assert.equal(options.redirect, "error"); return reply({ schemaVersion: 1, claims: [claim, claim] }); },
  });
  assert.equal(called, 1); assert.equal(claims.length, 1); assert.equal("compliant" in claims[0], false);
});
test("provider API fails closed for scope mismatch, version, content type and HTTP failure", async () => {
  for (const body of [{ schemaVersion: 2, claims: [claim] }, { schemaVersion: 1, claims: [{ ...claim, registryId: "other" }] }]) {
    await assert.rejects(fetchExternalClaims({ endpoint: "https://api.example.gov/v1/claims", token: "token", scope, fetchImpl: async () => reply(body) }));
  }
  await assert.rejects(fetchExternalClaims({ endpoint: "https://api.example.gov/v1/claims", token: "token", scope, fetchImpl: async () => reply({}, 503) }), /HTTP 503/);
  await assert.rejects(fetchExternalClaims({ endpoint: "https://api.example.gov/v1/claims", token: "token", scope, fetchImpl: async () => reply({}, 200, "text/html") }), /must be JSON/);
  await assert.rejects(fetchExternalClaims({ endpoint: "http://api.example.gov/v1/claims", token: "token", scope, fetchImpl: async () => { throw Error("must not fetch"); } }), /endpoint/);
});
test("provider API rejects oversized response without content length", async () => {
  await assert.rejects(fetchExternalClaims({ endpoint: "https://api.example.gov/v1/claims", token: "token", scope,
    fetchImpl: async () => new Response(" ".repeat(1_000_001), { headers: { "content-type": "application/json" } }) }), /too large/);
});
