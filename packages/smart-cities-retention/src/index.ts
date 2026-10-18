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
  if (!claim.sourceUrl || !claim.policy || !claim.obligation || !claim.observedAt) {
    throw new Error("Retention source, policy, obligation, and observation are required");
  }
  let source: URL;
  try { source = new URL(claim.sourceUrl); } catch { throw new Error("Invalid retention source URL"); }
  if (source.protocol !== "https:" || source.username || source.password) throw new Error("Invalid retention source URL");
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
