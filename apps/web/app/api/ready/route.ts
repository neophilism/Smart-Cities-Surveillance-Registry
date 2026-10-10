import { getDatabasePool } from "../../../lib/database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Database-backed readiness for the service's load balancer and Engine Room.
 * Never include a connection string, SQL error or private source metadata.
 */
export async function GET() {
  const timestamp = new Date().toISOString();
  const headers = { "Cache-Control": "no-store" };
  try {
    const result = await getDatabasePool().query<{ installed: boolean }>(
      `SELECT EXISTS (
         SELECT 1
         FROM civic_registry_configurations
         WHERE registry_id = $1
       ) AS installed`,
      ["smart-cities-surveillance-registry"],
    );
    if (result.rows[0]?.installed !== true) {
      return Response.json(
        {
          status: "unavailable",
          service: "smart-cities-surveillance-registry",
          reason: "registry_not_initialized",
          timestamp,
        },
        { status: 503, headers },
      );
    }
    return Response.json(
      {
        status: "ready",
        service: "smart-cities-surveillance-registry",
        timestamp,
      },
      { headers },
    );
  } catch {
    return Response.json(
      {
        status: "unavailable",
        service: "smart-cities-surveillance-registry",
        reason: "database_not_ready",
        timestamp,
      },
      { status: 503, headers },
    );
  }
}
