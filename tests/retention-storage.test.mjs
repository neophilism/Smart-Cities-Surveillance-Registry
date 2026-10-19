import assert from "node:assert/strict";
import { test } from "node:test";
import { PostgresRetentionObservations } from "../packages/database/src/retention.ts";
const row={registryId:"city",recordId:"deployment",sourceUrl:"https://city.example.gov/rules",
 observedAt:"2026-10-19T00:00:00Z",policy:"30 days",obligation:"Delete within 30 days",
 measuredFulfillment:"not_reported",verification:"unverified"};
test("scoped inserts are parameterized, deduplicated, and never mutate source claims",async()=>{
 const seen=new Set();
 const sqls=[];
 const db=new PostgresRetentionObservations({query:async(sql,params)=>{
  sqls.push(sql);
  assert.equal(params[0],"city");
  assert.equal(params[1],"deployment");
  const key=JSON.stringify(params);
  if (seen.has(key))return {rowCount:0};
  seen.add(key);return {rowCount:1};
 }});
 assert.equal(await db.insert(row),true);
 assert.equal(await db.insert(row),false);
 assert.match(sqls[0],/ON CONFLICT DO NOTHING/);
});
test("invalid observations fail before database access and reads always filter by registry plus record",async()=>{
 let calls=0;
 const db=new PostgresRetentionObservations({query:async(_sql,params)=>{
   calls++; assert.deepEqual(params,["city","deployment"]);return {rows:[]};
 }});
 await assert.rejects(db.insert({...row,measuredFulfillment:"deleted"}),/INVALID_RETENTION_OBSERVATION/);
 await assert.rejects(db.insert({...row,sourceUrl:"http://localhost/private"}),/INVALID_RETENTION_PROVENANCE/);
 assert.equal(calls,0);
 assert.deepEqual(await db.list("city","deployment"),[]);
 assert.equal(calls,1);
 await assert.rejects(db.list("","deployment"),/INVALID_RETENTION_SCOPE/);
});
