import type { Pool } from "pg";
export interface RetentionRow {
 registryId:string;recordId:string;sourceUrl:string;observedAt:string;policy:string;obligation:string;
 measuredFulfillment:"not_reported"|"reported_complete"|"reported_incomplete";
 verification:"unverified"|"independently_verified";
}
/** Internal store only. Callers authorize every insert and public disclosure separately. */
export class PostgresRetentionObservations {
 constructor(private readonly pool:Pool,private readonly authorize:(action:"read"|"write",scope:{registryId:string;recordId:string})=>boolean){
  if(typeof authorize!=="function")throw new Error("RETENTION_AUTH_REQUIRED");
 }
 async insert(row:RetentionRow):Promise<boolean>{
  if (!row || ![row.registryId,row.recordId,row.sourceUrl,row.observedAt,row.policy,row.obligation]
      .every(v=>typeof v==="string"&&v.length>0&&v.length<=4096) ||
      !["not_reported","reported_complete","reported_incomplete"].includes(row.measuredFulfillment) ||
      !["unverified","independently_verified"].includes(row.verification))
      throw new Error("INVALID_RETENTION_OBSERVATION");
  if(!this.authorize("write",{registryId:row.registryId,recordId:row.recordId}))throw new Error("RETENTION_FORBIDDEN");
  const url=new URL(row.sourceUrl);
  if(url.protocol!=="https:"||url.username||url.password||url.hash||!Number.isFinite(Date.parse(row.observedAt)))
      throw new Error("INVALID_RETENTION_PROVENANCE");
  const result=await this.pool.query(
   "INSERT INTO civic_smart_city_retention_observations (registry_id,record_id,source_url,observed_at,policy,obligation,reported_fulfillment,source_verification) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING",
   [row.registryId,row.recordId,row.sourceUrl,row.observedAt,row.policy,row.obligation,row.measuredFulfillment,row.verification]);
  return result.rowCount===1;
 }
 async list(registryId:string,recordId:string):Promise<RetentionRow[]>{
  if(!registryId||!recordId||registryId.length>255||recordId.length>255)throw new Error("INVALID_RETENTION_SCOPE");
  if(!this.authorize("read",{registryId,recordId}))throw new Error("RETENTION_FORBIDDEN");
  const result=await this.pool.query<{
   registry_id:string;record_id:string;source_url:string;observed_at:Date;
   policy:string;obligation:string;
   reported_fulfillment:RetentionRow["measuredFulfillment"];
   source_verification:RetentionRow["verification"];
  }>("SELECT registry_id,record_id,source_url,observed_at,policy,obligation,reported_fulfillment,source_verification FROM civic_smart_city_retention_observations WHERE registry_id=$1 AND record_id=$2 ORDER BY observed_at DESC LIMIT 100",[registryId,recordId]);
  return result.rows.map(r=>({registryId:r.registry_id,recordId:r.record_id,sourceUrl:r.source_url,
   observedAt:r.observed_at.toISOString(),policy:r.policy,obligation:r.obligation,
   measuredFulfillment:r.reported_fulfillment,verification:r.source_verification}));
 }
}
