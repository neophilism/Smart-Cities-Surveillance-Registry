import { createDatabasePool } from "../../database/src/pool.ts";
import { PostgresExternalComplianceRepository } from "../../database/src/external-compliance.ts";
import { fetchExternalClaims } from "./index.ts";

const scope = {
  registryId: process.env.SMART_CITIES_COMPLIANCE_REGISTRY_ID ?? "",
  recordId: process.env.SMART_CITIES_COMPLIANCE_RECORD_ID ?? "",
  providerId: process.env.SMART_CITIES_COMPLIANCE_PROVIDER_ID ?? "",
};
const endpoint = process.env.SMART_CITIES_COMPLIANCE_ENDPOINT ?? "";
const token = process.env.SMART_CITIES_COMPLIANCE_TOKEN ?? "";

if (!scope.registryId || !scope.recordId || !scope.providerId || !endpoint || !token) {
  throw new Error("External compliance endpoint, token, registry, record and provider configuration are required");
}
const pool = createDatabasePool({ applicationName: "smart-cities-external-compliance" });
const repository = new PostgresExternalComplianceRepository(pool);
try {
  const claims = await fetchExternalClaims({ endpoint, token, scope });
  const result = await repository.importClaims(scope, claims);
  process.stdout.write(JSON.stringify(result) + "\n");
} catch (error) {
  const errorCode = error instanceof Error && /response|claim|payload|JSON|scope|version/i.test(error.message)
    ? "INVALID_RESPONSE" : "PROVIDER_ERROR";
  try { await repository.recordFailure(scope, errorCode); } catch { /* Original failure remains primary. */ }
  process.stderr.write("External compliance import failed: " + errorCode + "\n");
  process.exitCode = 1;
} finally { await pool.end(); }
