import { readFile } from "node:fs/promises";

import { parseRegistryConfig } from "@civic-registry/config";

import { runMigrations } from "./migrations.ts";
import { createDatabasePool } from "./pool.ts";
import { PostgresRegistryConfigRepository } from "./repositories.ts";

/**
 * Idempotent first-install bootstrapping. Never seeds the fictitious
 * Harborview data, overwrites reviewed production configuration, or
 * publishes an imported record.
 */
async function main(): Promise<void> {
  const path = process.env.SMART_CITIES_CONFIG_PATH?.trim() || "config/registry.yaml";
  const source = await readFile(path, "utf8");
  const config = parseRegistryConfig(source, { sourceName: path });
  const pool = createDatabasePool({
    applicationName: "smart-cities-bootstrap",
  });

  try {
    await runMigrations(pool);
    const repository = new PostgresRegistryConfigRepository(pool);
    const existing = await repository.get(config.registry.id);

    if (existing) {
      if (existing.schemaVersion !== config.schemaVersion) {
        throw new Error(
          "Installed registry schema version differs from the checked-in configuration. " +
            "Apply configuration changes through a reviewed migration.",
        );
      }
      console.log(
        JSON.stringify({ status: "already_installed", registryId: config.registry.id }),
      );
      return;
    }

    await repository.upsert(config);
    console.log(
      JSON.stringify({ status: "installed", registryId: config.registry.id }),
    );
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(
    "Registry configuration bootstrap failed:",
    error instanceof Error ? error.message : "unknown_error",
  );
  process.exitCode = 1;
});
