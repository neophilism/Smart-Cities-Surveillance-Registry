import { readFile } from "node:fs/promises";

import {
  createDatabasePool,
  PostgresRegistryConfigRepository,
  runMigrations,
} from "@civic-registry/database";

import {
  SMART_CITIES_REGISTRY_ID,
  runConfiguredSourceRefresh,
} from "./index.ts";
import { publishEngineRoomRefreshTelemetry } from "./engine-room.ts";

async function main(): Promise<void> {
  const file = process.env.SMART_CITIES_SOURCES_CONFIG || "config/official-sources.json";
  const raw = JSON.parse(await readFile(file, "utf8")) as unknown;
  const pool = createDatabasePool({ applicationName: "smart-cities-source-refresh" });
  try {
    await runMigrations(pool);
    const existing = await new PostgresRegistryConfigRepository(pool).get(
      SMART_CITIES_REGISTRY_ID,
    );
    if (!existing) {
      throw new Error("Smart Cities registry configuration is not installed.");
    }
    const result = await runConfiguredSourceRefresh(pool, raw, { limit: 25 });
    console.log(
      JSON.stringify({
        command: "smart-cities-source-refresh",
        claimed: result.claimed,
        completed: result.completed,
        completedWithWarnings: result.completedWithWarnings,
        failed: result.failed,
        runIds: result.runs.map((item) => item.id),
      }),
    );
    // Telemetry is optional, signed and scoped; do not invent a success signal
    // if the scheduler had no completed source observations.
    const delivery = await publishEngineRoomRefreshTelemetry(result);
    console.log(JSON.stringify({ command: "engine-room-telemetry", status: delivery }));
    if (result.failed > 0) process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(
    "Approved official source refresh failed:",
    error instanceof Error ? error.message : "unknown_error",
  );
  process.exitCode = 1;
});
