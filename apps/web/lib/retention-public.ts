/** Caller MUST pass disclosure-projected public fields, never raw registry storage. */
export interface PublicRetentionField {
  id: string;
  empty: boolean;
  displayValue: string;
}
export interface PublicRetentionStatus {
  publishedMaximumRetentionDays: string | null;
  publishedRetentionBasis: string | null;
  actualDeletionVerified: false;
  evidenceStatus: "not_verified";
  explanation: string;
}
export function publicRetentionStatus(fields: readonly PublicRetentionField[]): PublicRetentionStatus {
  const find = (id:string) => fields.find(field => field.id===id && !field.empty)?.displayValue ?? null;
  return {
    publishedMaximumRetentionDays: find("retention_days"),
    publishedRetentionBasis: find("retention_basis"),
    actualDeletionVerified: false,
    evidenceStatus: "not_verified",
    explanation: "Published retention conditions and provider statements do not prove physical deletion.",
  };
}
