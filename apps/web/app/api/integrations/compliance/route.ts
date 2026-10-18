import { PostgresExternalComplianceRepository } from "@civic-registry/database";
import { handleExternalClaimPush } from "../../../../../../packages/smart-cities-compliance/src/push.ts";
import { getDatabasePool } from "../../../lib/database.ts";

export const runtime = "nodejs";
export async function POST(request: Request): Promise<Response> {
  return handleExternalClaimPush(request, {
    token: process.env.SMART_CITIES_COMPLIANCE_IMPORT_TOKEN ?? "",
    registryId: process.env.SMART_CITIES_COMPLIANCE_REGISTRY_ID ?? "",
    providerId: process.env.SMART_CITIES_COMPLIANCE_PROVIDER_ID ?? "",
    store: new PostgresExternalComplianceRepository(getDatabasePool()),
  });
}
