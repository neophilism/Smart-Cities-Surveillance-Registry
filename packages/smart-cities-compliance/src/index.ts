export interface ExternalClaim {
  registryId: string; recordId: string; providerId: string;
  sourceId: string; sourceUrl: string; observedAt: string;
  kind: "authorization" | "accountability" | "audit"; assertion: string;
}
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
export function importExternalClaims(inputs: readonly unknown[], scope: Pick<ExternalClaim, "registryId" | "recordId" | "providerId">): { accepted: ExternalClaim[]; rejected: { index: number; error: string }[] } {
  const accepted: ExternalClaim[] = [];
  const rejected: { index: number; error: string }[] = [];
  const seen = new Set<string>();
  inputs.forEach((input, index) => {
    try {
      const claim = validateExternalClaim(input, scope);
      const key = JSON.stringify([claim.providerId, claim.sourceId, claim.kind, claim.observedAt]);
      if (!seen.has(key)) { seen.add(key); accepted.push(claim); }
    } catch (error) { rejected.push({ index, error: error instanceof Error ? error.message : "Invalid claim" }); }
  });
  return { accepted, rejected };
}
export interface ExternalProviderRequest {
  endpoint: string;
  token: string;
  scope: Pick<ExternalClaim, "registryId" | "recordId" | "providerId">;
  fetchImpl?: typeof fetch;
}
/** Claims remain source assertions, never permissions, publication approval or certification. */
export async function fetchExternalClaims(request: ExternalProviderRequest): Promise<ExternalClaim[]> {
  let endpoint: URL;
  try { endpoint = new URL(request.endpoint); } catch { throw new Error("Invalid provider endpoint"); }
  if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password || endpoint.hash || !endpoint.hostname.includes(".")) throw new Error("Invalid provider endpoint");
  if (!request.token || /[\r\n]/.test(request.token)) throw new Error("Provider token is required");
  for (const value of Object.values(request.scope)) if (!value || typeof value !== "string") throw new Error("Provider scope is required");
  const response = await (request.fetchImpl ?? fetch)(endpoint, {
    method: "GET", headers: { accept: "application/json", authorization: "Bearer " + request.token },
    redirect: "error", cache: "no-store", signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("Provider request failed with HTTP " + response.status);
  if (!(response.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) throw new Error("Provider response must be JSON");
  const declaredLength = Number(response.headers.get("content-length") ?? "0");
  if (!Number.isFinite(declaredLength) || declaredLength > 1_000_000) throw new Error("Provider response too large");
  const raw = await response.text();
  if (new TextEncoder().encode(raw).length > 1_000_000) throw new Error("Provider response too large");
  let payload: unknown;
  try { payload = JSON.parse(raw); } catch { throw new Error("Invalid provider JSON"); }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Invalid provider payload");
  const envelope = payload as Record<string, unknown>;
  if (envelope.schemaVersion !== 1 || !Array.isArray(envelope.claims) || envelope.claims.length > 500) throw new Error("Unsupported provider response");
  const result = importExternalClaims(envelope.claims, request.scope);
  if (result.rejected.length) throw new Error("Provider response contains " + result.rejected.length + " invalid scoped claims");
  return result.accepted;
}
