# Production readiness operator procedure

This is a non-destructive probe. It does not deploy, migrate, restart, or certify a service.

1. Deploy only with approved project-specific Render/Neon resources and existing release permissions. Confirm the deployed commit and migration record before asserting production readiness.
2. After deployment, run `READY_BASE_URL=https://your-approved-origin.example node scripts/probe-readiness.mjs`. The command requires HTTPS, disables redirects, times out, and requires HTTP 200 plus the expected service-bound ready body.
3. A failed probe means readiness is **not verified**; preserve the deployed SHA, response status, service logs, and migration status in the incident record. Do not print secrets or connection strings. Investigate database reachability, schema setup, and configuration, then retry only after remediation.
4. `/api/health` is liveness and cannot substitute for the DB-backed `/api/ready` check. A successful probe is not a full E2E release test or independent security audit.
5. Follow configured rollback procedures and owner production-action gates for changing traffic or production state. No automated rollback or unauthorized deployment is performed by this script.
