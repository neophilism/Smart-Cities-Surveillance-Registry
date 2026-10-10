import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import {
  publishEngineRoomRefreshTelemetry,
} from "../packages/smart-cities-refresh/src/engine-room.ts";

const env = {
  ENGINE_ROOM_BASE_URL: "https://engine-room.example",
  SMART_CITIES_ENGINE_ROOM_KEY_ID: "smart-cities",
  SMART_CITIES_ENGINE_ROOM_SECRET: "0123456789abcdef0123456789abcdef",
};

const result = {
  claimed: 2,
  completed: 1,
  completedWithWarnings: 0,
  failed: 1,
  runs: [
    {
      id: "run-1",
      startedAt: "2026-10-08T10:00:00.000Z",
      completedAt: "2026-10-08T10:01:00.000Z",
    },
    {
      id: "run-2",
      startedAt: "2026-10-08T10:00:00.000Z",
      completedAt: "2026-10-08T10:02:00.000Z",
    },
  ],
};

test("Engine Room only accepts observed, signed refresh measurements", async () => {
  let observed = false;
  const fetchImpl = async (url, options) => {
    observed = true;
    assert.equal(url.toString(), "https://engine-room.example/api/telemetry");
    assert.equal(options.method, "POST");
    const content = Buffer.from(options.body);
    const timestamp = options.headers["X-Engine-Room-Timestamp"];
    const expected = createHmac("sha256", env.SMART_CITIES_ENGINE_ROOM_SECRET)
      .update(timestamp + ".")
      .update(content)
      .digest("hex");
    assert.equal(
      options.headers["X-Engine-Room-Signature"],
      "sha256=" + expected,
    );
    const decoded = JSON.parse(content.toString("utf8"));
    assert.equal(decoded.records[0].metric, "error-rate-percent");
    assert.equal(decoded.records[0].value, 50);
    assert.equal(decoded.records[0].observedAt, "2026-10-08T10:02:00.000Z");
    assert.equal(decoded.records[0].kind, "metric");
    return new Response("", { status: 202 });
  };
  assert.equal(await publishEngineRoomRefreshTelemetry(result, {
    env,
    fetchImpl,
    nowMs: 1791461000000,
  }), "accepted");
  assert.equal(observed, true);
});

test("Engine Room telemetry stays disabled without issued credentials", async () => {
  assert.equal(
    await publishEngineRoomRefreshTelemetry(result, { env: {} }),
    "disabled",
  );
});

test("Engine Room refuses invalid URLs and incomplete credentials", async () => {
  await assert.rejects(
    publishEngineRoomRefreshTelemetry(result, {
      env: { ...env, ENGINE_ROOM_BASE_URL: "http://example.com" },
    }),
    /HTTPS origin/,
  );
  await assert.rejects(
    publishEngineRoomRefreshTelemetry(result, {
      env: { ...env, SMART_CITIES_ENGINE_ROOM_SECRET: "" },
    }),
    /incomplete credentials/,
  );
});

test("No due jobs cannot be counted as healthy source observations", async () => {
  assert.equal(
    await publishEngineRoomRefreshTelemetry(
      { claimed: 0, completed: 0, completedWithWarnings: 0, failed: 0, runs: [] },
      { env },
    ),
    "no_observations",
  );
});

test("Engine Room refuses finished-run telemetry when runs lack completion", async () => {
  await assert.rejects(
    publishEngineRoomRefreshTelemetry(
      { ...result, runs: [{ id: "unfinished" }] },
      { env },
    ),
    /unfinished source runs/,
  );
});
