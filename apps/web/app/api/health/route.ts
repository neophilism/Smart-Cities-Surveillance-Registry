export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    {
      status: "ok",
      service: "smart-cities-surveillance-registry",
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
