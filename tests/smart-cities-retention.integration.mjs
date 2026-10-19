import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { parseRegistryConfig } from "../packages/config/src/index.ts";
import { createDatabasePool, runMigrations, seedRegistry } from "../packages/database/src/index.ts";
import { PostgresRetentionObservations } from "../packages/database/src/retention.ts";
const databaseUrl=process.env.DATABASE_URL;
if(!databaseUrl)throw new Error("DATABASE_URL required for retention persistence integration test");
test("PostgreSQL retention observation is unique, scoped, and never treated as deletion proof",async()=>{
 const pool=createDatabasePool({connectionString:databaseUrl,applicationName:"retention-integration-test"});
 try{
  await runMigrations(pool);
  await pool.query("TRUNCATE civic_registry_configurations CASCADE");
  const config=parseRegistryConfig(await readFile("config/registry.yaml","utf8"),{sourceName:"config/registry.yaml"});
  const seed=JSON.parse(await readFile("examples/smart-cities-demo/seed.json","utf8"));
  await seedRegistry(pool,config,seed);
  const db=new PostgresRetentionObservations(pool,(_action,scope)=>scope.registryId===config.registry.id);
  const row={registryId:config.registry.id,recordId:"demo-deployment-downtown",
   sourceUrl:"https://city.example.gov/retention/policy",observedAt:"2026-10-19T12:00:00Z",
   policy:"Thirty days",obligation:"Delete after thirty days",
   measuredFulfillment:"not_reported",verification:"unverified"};
  assert.equal(await db.insert(row),true);
  assert.equal(await db.insert(row),false);
  const found=await db.list(row.registryId,row.recordId);
  assert.equal(found.length,1);
  assert.equal(found[0].measuredFulfillment,"not_reported");
  assert.deepEqual(await db.list(row.registryId,"demo-vendor-civic-vision"),[]);
  await assert.rejects(db.insert({...row,recordId:"nonexistent-record"}));
 }finally{await pool.end()}
});
