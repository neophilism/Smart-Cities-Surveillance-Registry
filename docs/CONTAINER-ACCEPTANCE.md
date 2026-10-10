# Production container verification

The standard `CI` workflow runs TypeScript checks, unit and PostgreSQL
integration tests, migrations, and a Next.js application build.
The separate **Production container smoke** workflow builds the exact
`Dockerfile` intended for Render on relevant pull requests and pushes.
It verifies that the image can be assembled **without database credentials**
and that the container startup contract uses `DATABASE_URL_UNPOOLED`
for migrations while declaring port 10000 for Next.js.

This is a packaging test, not proof that a live Render instance is
connected to Neon or that production queries/ingestion succeed.

## Production acceptance after workspace selection

1. Confirm the destination Render workspace and intended service.
2. Configure the pooled app connection and direct migration connection
   to the **same existing Smart Cities Neon database**.
3. Deploy from `main` after all required PR and container-smoke checks pass.
4. Watch deployment events/logs, check HTTP 200 at `/api/ready`, and
   verify first-time registry configuration initialization.
5. Verify public search and the admin console in the live environment.
6. Add the verified Render public hostname to Engine Room monitoring.
7. Configure an approved official source and independently verify
   draft-only ingestion before turning on schedules or telemetry.

No assertion that the service is online follows from CI alone.
