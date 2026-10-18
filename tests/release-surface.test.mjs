import assert from "node:assert/strict";
import { test } from "node:test";
import { inspectReleaseSurface } from "../scripts/release-surface.mjs";
test("checks all read-only release endpoints with bounded redirects", async () => {
 const seen=[];
 const result=await inspectReleaseSurface("https://registry.example.gov",async (u,opts)=>{
  seen.push(u.pathname); assert.equal(opts.redirect,"error");
  return {status:200,json:async()=>u.pathname==="/api/ready"?
   {status:"ready",service:"smart-cities-surveillance-registry"}:
   u.pathname==="/api/v1/openapi.json"?{openapi:"3.1.0",paths:{}}:{}};
 });
 assert.deepEqual(seen,["/api/ready","/api/v1","/api/v1/openapi.json"]);
 assert.equal(result.reports.length,3);
});
test("failed readiness and non-HTTPS origins are not success",async()=>{
 await assert.rejects(()=>inspectReleaseSurface("http://registry.example.gov"),/HTTPS/);
 await assert.rejects(()=>inspectReleaseSurface("https://registry.example.gov",async()=>({status:503,json:async()=>({})})),/unavailable/);
});
