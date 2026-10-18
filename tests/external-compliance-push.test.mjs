import assert from "node:assert/strict";
import { test } from "node:test";
import { handleExternalClaimPush } from "../packages/smart-cities-compliance/src/push.ts";
const token = "0123456789abcdef0123456789abcdef";
const claim = { registryId: "city", recordId: "r1", providerId: "official", sourceId: "s1", sourceUrl: "https://city.example.gov/report", observedAt: "2026-10-18T12:00:00Z", kind: "audit", assertion: "Review pending" };
function setup() {
  const calls = [];
  return { calls, config: { token, registryId: "city", providerId: "official",
    store: { async importClaims(scope, claims) { calls.push({ scope, claims }); return { importId: "run-1", received: claims.length, inserted: claims.length }; } } } };
}
function request(body, suppliedToken = token, contentType = "application/json") {
  return new Request("https://registry.example.gov/api/v1/integrations/compliance", { method: "POST",
    headers: { authorization: "Bearer " + suppliedToken, "content-type": contentType }, body: JSON.stringify(body) });
}
test("machine integration accepts scoped facts with audit result, never compliance status", async () => {
  const { calls, config } = setup();
  const response = await handleExternalClaimPush(request({ schemaVersion: 1, recordId: "r1", claims: [claim, claim] }), config);
  assert.equal(response.status, 202);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].scope, { registryId: "city", recordId: "r1", providerId: "official" });
  assert.equal(calls[0].claims.length, 1);
  assert.equal("compliant" in calls[0].claims[0], false);
});
test("missing credential, weak server config, cross-tenant and cross-provider data are denied", async () => {
  const { calls, config } = setup();
  assert.equal((await handleExternalClaimPush(request({ schemaVersion: 1, recordId: "r1", claims: [claim] }, "wrong"), config)).status, 401);
  assert.equal((await handleExternalClaimPush(request({ schemaVersion: 1, recordId: "r1", claims: [claim] }), { ...config, token: "" })).status, 503);
  for (const bad of [{ ...claim, registryId: "foreign" }, { ...claim, providerId: "foreign" }, { ...claim, recordId: "other" }]) {
    assert.equal((await handleExternalClaimPush(request({ schemaVersion: 1, recordId: "r1", claims: [bad] }), config)).status, 400);
  }
  assert.equal(calls.length, 0);
});
test("invalid version, content type and failed persistence never return success", async () => {
  const { config } = setup();
  assert.equal((await handleExternalClaimPush(request({ schemaVersion: 2, recordId: "r1", claims: [claim] }), config)).status, 400);
  assert.equal((await handleExternalClaimPush(request({ schemaVersion: 1, recordId: "r1", claims: [claim] }, token, "text/plain"), config)).status, 415);
  const response = await handleExternalClaimPush(request({ schemaVersion: 1, recordId: "r1", claims: [claim] }), { ...config, store: { async importClaims() { throw Error("database unavailable"); } } });
  assert.equal(response.status, 500);
});
