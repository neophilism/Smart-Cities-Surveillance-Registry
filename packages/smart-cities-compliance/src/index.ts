export interface ExternalClaim {
  registryId: string; recordId: string; providerId: string;
  sourceId: string; sourceUrl: string; observedAt: string;
  kind: "authorization" | "accountability" | "audit"; assertion: string;
}
/** Externally asserted facts are evidence only; never permissions or certification. */
export function validateExternalClaim(input: unknown, scope: Pick<ExternalClaim, "registryId" | "recordId" | "providerId">): ExternalClaim {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid claim");
  const item = input as Record<string, unknown>;
  if (item.registryId !== scope.registryId || item.recordId !== scope.recordId || item.providerId !== scope.providerId) throw new Error("Scope mismatch");
  for (const key of ["sourceId", "assertion", "observedAt", "sourceUrl"]) {
    if (typeof item[key] !== "string" || !(item[key] as string).trim() || (item[key] as string).length > 2048) throw new Error("Invalid " + key);
  }
  let url: URL;
  try { url = new URL(item.sourceUrl as string); } catch { throw new Error("Invalid source URL"); }
  if (url.protocol !== "https:" || url.username || url.password || !url.hostname.includes(".")) throw new Error("Invalid source URL");
  if (!/^\d{4}-\d{2}-\d{2}T/.test(item.observedAt as string) || !Number.isFinite(Date.parse(item.observedAt as string))) throw new Error("Invalid timestamp");
  if (item.kind !== "authorization" && item.kind !== "accountability" && item.kind !== "audit") throw new Error("Invalid claim kind");
  return { ...scope, sourceId: item.sourceId as string, sourceUrl: item.sourceUrl as string, observedAt: item.observedAt as string, kind: item.kind, assertion: item.assertion as string };
}
