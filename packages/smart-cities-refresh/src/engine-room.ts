import { createHash, createHmac } from "node:crypto";
import type { RunDueSourceRefreshResult } from "@civic-registry/database";

export type EngineRoomDelivery = "disabled" | "no_observations" | "accepted";

export interface EngineRoomTelemetryOptions {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  nowMs?: number;
}

/**
 * Report real finished source-refresh runs to the existing Engine Room
 * HMAC telemetry endpoint. Never derive liveness or site-availability
 * claims from this source-job error-rate observation.
 */
export async function publishEngineRoomRefreshTelemetry(
  result: RunDueSourceRefreshResult,
  options: EngineRoomTelemetryOptions = {},
): Promise<EngineRoomDelivery> {
  const env = options.env ?? process.env;
  const baseUrl = env.ENGINE_ROOM_BASE_URL?.trim() ?? "";
  const keyId = env.SMART_CITIES_ENGINE_ROOM_KEY_ID?.trim() ?? "";
  const secret = env.SMART_CITIES_ENGINE_ROOM_SECRET ?? "";

  if (!baseUrl && !keyId && !secret) return "disabled";
  if (!baseUrl || !keyId || Buffer.byteLength(secret) < 32) {
    throw new Error("Engine Room telemetry has incomplete credentials.");
  }
  if (!/^[A-Za-z0-9._-]{1,64}$/.test(keyId)) {
    throw new Error("Engine Room key ID is invalid.");
  }

  let base: URL;
  try {
    base = new URL(baseUrl);
  } catch {
    throw new Error("Engine Room base URL is invalid.");
  }
  if (
    base.protocol !== "https:" ||
    !base.hostname ||
    base.username ||
    base.password ||
    base.port ||
    base.pathname !== "/" ||
    base.search ||
    base.hash
  ) {
    throw new Error("Engine Room requires a clean HTTPS origin.");
  }

  // A scheduler with zero claimed jobs has not observed success or failure.
  if (result.claimed === 0 || result.runs.length === 0) {
    return "no_observations";
  }

  const runIds = result.runs.map((run) => run.id).sort();
  const completed = result.runs
    .map((run) => run.completedAt)
    .filter((value): value is string => Boolean(value))
    .sort();
  if (completed.length !== result.runs.length) {
    throw new Error("Cannot publish telemetry for unfinished source runs.");
  }
  const observedAt = new Date(completed.at(-1)!).toISOString();
  const batchIdentity = createHash("sha256")
    .update(runIds.join("|"), "utf8")
    .digest("hex")
    .slice(0, 32);
  const deliveryId = "smart-cities-refresh-" + batchIdentity;
  const errorRate = (result.failed / result.claimed) * 100;

  const body = Buffer.from(
    JSON.stringify({
      version: 1,
      deliveryId,
      records: [
        {
          kind: "metric",
          externalId: "source-failure-rate-" + batchIdentity,
          metric: "error-rate-percent",
          value: errorRate,
          observedAt,
        },
      ],
    }),
    "utf8",
  );
  const timestamp = String(options.nowMs ?? Date.now());
  const signature = createHmac("sha256", secret)
    .update(timestamp + ".")
    .update(body)
    .digest("hex");

  const url = new URL("/api/telemetry", base);
  const response = await (options.fetchImpl ?? fetch)(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Engine-Room-Key": keyId,
      "X-Engine-Room-Timestamp": timestamp,
      "X-Engine-Room-Signature": "sha256=" + signature,
    },
    body,
    signal: AbortSignal.timeout(10_000),
    redirect: "error",
  });
  if (!response.ok) {
    // No server response body is echoed: it could contain confidential context.
    throw new Error("Engine Room rejected source-refresh telemetry: HTTP " + response.status);
  }
  await response.body?.cancel();
  return "accepted";
}
