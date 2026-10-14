# Engine Room monitoring integration

> **October 13, 2026 — Render preview intentionally deleted.** There is currently no Smart Cities Render web deployment to monitor. Engine Room must not mistake the deliberately missing preview for an unexpected production outage or claim verified Smart Cities web uptime. This is a **hosting-only** change; GitHub PRs, CI and independently configured source-refresh tasks can continue. Do not alter telemetry or job gates simply because the web preview is absent. The integration below remains ready for future authorized redeployment.

The Smart Cities Registry is monitored through two independent signals:

1. **HTTP deployment readiness** `GET /api/ready` verifies that the
   web process can query PostgreSQL and that the Smart Cities registry
   configuration exists. Engine Room or an external uptime monitor must
   probe the real deployed URL regularly; simply adding a URL to a
   dashboard does not prove that the service is live.
2. **Official-source refresh outcomes** `pnpm db:refresh-official` uses
   approved provider configurations. After a nonempty batch of completed
   jobs, the worker may send a signed `error-rate-percent` telemetry
   sample to Engine Room, scoped to source `smart-cities-refresh`.
   This metric is the percentage of claimed source jobs that failed,
   **not** the site's HTTP error rate or uptime.

The optional sender is disabled unless all three environment values exist:

```text
ENGINE_ROOM_BASE_URL=https://<actual-engine-room-host>
SMART_CITIES_ENGINE_ROOM_KEY_ID=<issued-scoped-key-id>
SMART_CITIES_ENGINE_ROOM_SECRET=<issued-random-secret-32-bytes-minimum>
```

Issue the key in Engine Room's `ENGINE_ROOM_TELEMETRY_KEYS`, scoped to
this project's registered UUID, environment `production`, source
`smart-cities-refresh`, adapter `engine-room-v1`, and only the
`metric` capability. The sender signs the exact JSON byte payload using
HMAC-SHA256 with `<timestamp>.` as the signing prefix. Delivery
identities are deterministic for the same completed refresh runs so
replays are idempotent. Missing credentials are not silently made up,
and partial configuration is a hard failure.

The GitHub Actions refresh workflow needs the corresponding secrets and
base URL repository variable before sending telemetry. It will only run
after the explicit `SMART_CITIES_REFRESH_ENABLED=true` variable is set.

## Operator acceptance

- Observe a successful HTTP 200 on the production `/api/ready` endpoint.
- Verify the actual Render service status and latest successful deploy.
- Verify source-refresh jobs have run with audited real-source mappings
  and the ingestion failures/stale counts are visible in the admin console.
- Verify an accepted Engine Room telemetry delivery has been persisted
  against the intended Smart Cities project UUID.
- Set alerts for 503 readiness, stale sources, repeated refresh failures,
  and unexpectedly missing telemetry. A sleeping free Render service
  cannot guarantee continuous monitoring.

Until the credentials and deployed URL are verified, **Engine Room
monitoring is prepared, not operational**.
