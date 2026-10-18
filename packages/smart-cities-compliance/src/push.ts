import { createHash, timingSafeEqual } from "node:crypto";
import { importExternalClaims, type ExternalClaim } from "./index.ts";

export interface ExternalClaimStore {
  importClaims(
    scope: Pick<ExternalClaim, "registryId" | "recordId" | "providerId">,
    claims: readonly ExternalClaim[],
  ): Promise<{ importId: string; received: number; inserted: number }>;
}
export interface PushConfig {
  token: string;
  registryId: string;
  providerId: string;
  store: ExternalClaimStore;
}
function authorized(header: string | null, secret: string): boolean {
  if (!header?.startsWith("Bearer ")) return false;
  const received = createHash("sha256").update(header.slice(7)).digest();
  const expected = createHash("sha256").update(secret).digest();
  return timingSafeEqual(received, expected);
}
async function readLimited(request: Request): Promise<string> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(declared) || declared > 1_000_000) throw new Error("TOO_LARGE");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("EMPTY");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1_000_000) throw new Error("TOO_LARGE");
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    throw error;
  }
  const bytes = new Uint8Array(size);
  let position = 0;
  for (const chunk of chunks) { bytes.set(chunk, position); position += chunk.byteLength; }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}
/** Machine-only push API; configured token and tenant/provider are server bound. */
export async function handleExternalClaimPush(request: Request, config: PushConfig): Promise<Response> {
  if (!config.registryId || !config.providerId || config.token.length < 32) return Response.json({ error: "Integration unavailable" }, { status: 503 });
  if (!authorized(request.headers.get("authorization"), config.token)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) return Response.json({ error: "JSON required" }, { status: 415 });
  let payload: unknown;
  try { payload = JSON.parse(await readLimited(request)); }
  catch (error) { return Response.json({ error: "Invalid request" }, { status: error instanceof Error && error.message === "TOO_LARGE" ? 413 : 400 }); }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return Response.json({ error: "Invalid request" }, { status: 400 });
  const value = payload as Record<string, unknown>;
  if (value.schemaVersion !== 1 || typeof value.recordId !== "string" || !value.recordId.trim() || value.recordId.length > 200 || !Array.isArray(value.claims) || value.claims.length > 500) {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }
  const scope = { registryId: config.registryId, recordId: value.recordId, providerId: config.providerId };
  const batch = importExternalClaims(value.claims, scope);
  if (batch.rejected.length) return Response.json({ error: "Invalid scoped claims" }, { status: 400 });
  try {
    const result = await config.store.importClaims(scope, batch.accepted);
    return Response.json(result, { status: 202, headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ error: "Import failed" }, { status: 500 });
  }
}
