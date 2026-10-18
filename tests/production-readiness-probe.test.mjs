import assert from "node:assert/strict";
import { test } from "node:test";
import { probeReadiness } from "../scripts/probe-readiness.mjs";
test("probe accepts only service-bound ready evidence", async () => {
 const good = await probeReadiness("https://registry.example.gov", {fetchImpl: async (url, init) => {
  assert.equal(url.pathname,"/api/ready"); assert.equal(init.redirect,"error");
  return {status:200, json:async()=>({status:"ready",service:"smart-cities-surveillance-registry"})};
 }});
 assert.equal(good.ready,true);
});
test("unready, wrong-service and HTTP origins fail", async () => {
 await assert.rejects(()=>probeReadiness("http://registry.example.gov"),/HTTPS origin/);
 await assert.rejects(()=>probeReadiness("https://registry.example.gov", {fetchImpl:async()=>({status:503,json:async()=>({status:"unavailable"})})}),/non-200/);
 await assert.rejects(()=>probeReadiness("https://registry.example.gov", {fetchImpl:async()=>({status:200,json:async()=>({status:"ready",service:"other"})})}),/not ready/);
});
