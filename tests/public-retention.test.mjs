import assert from "node:assert/strict";
import { test } from "node:test";
import { publicRetentionStatus } from "../apps/web/lib/retention-public.ts";
test("public projection never promotes stated policy to evidence of actual deletion",()=>{
 const result=publicRetentionStatus([
  {id:"retention_days",empty:false,displayValue:"30"},
  {id:"retention_basis",empty:false,displayValue:"Official city ordinance"},
  {id:"private_record",empty:false,displayValue:"private field"}
 ]);
 assert.equal(result.publishedMaximumRetentionDays,"30");
 assert.equal(result.publishedRetentionBasis,"Official city ordinance");
 assert.equal(result.actualDeletionVerified,false);
 assert.equal("private_record" in result,false);
});
test("redacted and absent values do not leak into public responses",()=>{
 const result=publicRetentionStatus([{id:"retention_basis",empty:true,displayValue:"SECRET"}]);
 assert.equal(result.publishedRetentionBasis,null);
 assert.equal(result.publishedMaximumRetentionDays,null);
});
