/** Evidence-based retention and deletion display; never infer actual deletion. */
export type RetentionClaim = {
  registryId: string; recordId: string; sourceUrl: string; observedAt: string;
  policy: string; obligation: string;
  measuredFulfillment: "not_reported" | "reported_complete" | "reported_incomplete";
  verification: "unverified" | "independently_verified";
};
export type RetentionProjection = {
  policy: string; obligation: string; sourceUrl: string; observedAt: string;
  reportedFulfillment: string; actualDeletionVerified: boolean;
};
export function retentionProjection(
  claim: RetentionClaim,
  scope: { registryId: string; recordId: string },
): RetentionProjection {
  if (claim.registryId !== scope.registryId || claim.recordId !== scope.recordId) {
    throw new Error("Retention claim scope mismatch");
  }
  if (!claim || typeof claim !== "object" || Array.isArray(claim) ||\n      Object.keys(claim).sort().join(",") !== "measuredFulfillment,obligation,observedAt,policy,recordId,registryId,sourceUrl,verification") {\n    throw new Error("Invalid retention claim schema");\n  }\n  if (![claim.sourceUrl, claim.policy, claim.obligation, claim.observedAt].every(v =>\n      typeof v === "string" && v.trim().length > 0 && v.length <= 4096 && !/[\\x00-\\x1f\\x7f]/.test(v))) {
    throw new Error("Retention source, policy, obligation, and observation are required");
  }
  let source: URL;
  try { source = new URL(claim.sourceUrl); } catch { throw new Error("Invalid retention source URL"); }
  if (source.protocol !== "https:" || source.username || source.password || source.hash ||\n      source.hostname === "localhost" || source.hostname.endsWith(".localhost") ||\n      source.hostname.endsWith(".local") || source.hostname.endsWith(".internal") ||\n      /^[0-9.]+$/.test(source.hostname) || source.hostname.includes(":")) throw new Error("Invalid retention source URL");
  if (!Number.isFinite(Date.parse(claim.observedAt))) throw new Error("Invalid observation time");
  if (!["not_reported", "reported_complete", "reported_incomplete"].includes(claim.measuredFulfillment)) {
    throw new Error("Invalid fulfillment state");
  }
  if (!["unverified", "independently_verified"].includes(claim.verification)) {
    throw new Error("Invalid verification state");
  }
  return {
    policy: claim.policy, obligation: claim.obligation,
    sourceUrl: claim.sourceUrl, observedAt: claim.observedAt,
    reportedFulfillment: claim.measuredFulfillment,
    actualDeletionVerified: false, // Reported provider claims never prove physical deletion.
  };
}

/** Bounded history of previously disclosure-approved claims, never physical deletion proof. */
export function retentionHistory(
  claims: readonly RetentionClaim[], scope: {registryId:string;recordId:string}
): readonly RetentionProjection[] {
  if (!Array.isArray(claims) || claims.length > 100) throw new Error("Retention history limit exceeded");
  const entries = claims.map(claim => retentionProjection(claim,scope));
  const seen = new Set<string>();
  for (const entry of entries) {
    const key = JSON.stringify([entry.sourceUrl,entry.observedAt,entry.policy,entry.obligation]);
    if (seen.has(key)) throw new Error("Duplicate retention observation");
    seen.add(key);
  }
  return Object.freeze(entries.sort((a,b) => b.observedAt.localeCompare(a.observedAt)));
}
