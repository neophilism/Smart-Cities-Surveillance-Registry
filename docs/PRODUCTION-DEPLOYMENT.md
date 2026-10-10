# Production deployment — Smart Cities Surveillance Registry

## Status and architecture

The application is a Next.js service backed by PostgreSQL. The repository contains
a Render Blueprint and Dockerfile. These do not themselves deploy an instance.
The expected existing database project is **Smart Cities Surveillance Registry**
in Neon (AWS us-east-2); choose **Ohio** as the Render region to reduce latency.

The production database starts empty. Do **not** load the fictional Harborview
seed into a live public registry. The startup sequence runs schema migrations
and installs only the verified schema configuration on first boot.

## Deploy

1. Create or link a Render web service to this repository's `main` branch.
   `render.yaml` configures an Ohio Docker service and deploys only after
   the main-branch checks pass.
2. Set `DATABASE_URL` to the existing Neon project's **pooled** TLS connection
   string. Keep it exclusively in Render's secret environment configuration.
   Never commit it, log it, or copy it into PR descriptions.
3. Set `CIVIC_REGISTRY_ADMIN_TOKEN` to a strong random secret. The built-in
   console uses a shared administrator token; for production operator access,
   put `/admin` behind trusted identity-aware access control/SSO as well.
4. Start the service. Its Docker startup command runs `pnpm db:migrate` followed
   by `pnpm db:bootstrap-config`, then binds Next.js to `0.0.0.0:$PORT`.
5. Confirm `GET /api/health` responds (process liveness), and
   `GET /api/ready` returns HTTP 200 `{"status":"ready"}`. A 503 readiness
   means the database connection or registry configuration has not been
   established; it must not be accepted as a successful deployment.
6. Visit the public homepage and the restricted admin login. Verify the
   registry loads, and that no fictional demonstration records were installed.
7. Configure approved official data sources and reviewers **before** enabling
   production ingestion; imported records remain drafts until independently
   reviewed and published.

## Persistent evidence files

Neon stores registry metadata and audit history, not retrieved PDF bytes.
The document-ingestion component currently supports local content-addressed
storage. Render's free instances have ephemeral filesystems and do not support
persistent disks. Therefore **do not enable PDF retrieval/ingestion on a free
web service**: use an independently persistent file store or a suitable paid
persistent disk before collecting evidence. An ordinary redeploy can otherwise
erase the source bytes while the database retains references.

## Operations / Engine Room

- `/api/ready` is a safe unauthenticated *readiness* indicator, not an
  administrative API. It never emits SQL errors, secret values, record names,
  source endpoints, or private operator data.
- Collect GitHub CI/deploy outcomes and Render instance status in Engine Room.
- Alert on failing readiness, deploy failure, missing published source-refresh
  runs, consecutive ingestion failures, and stale sources.
- The free Render plan suspends after inactivity; use a paid always-on plan
  before claiming continuous availability or timely background refresh.
- Production source refresh should run in a scheduled worker, independent of
  Next.js request traffic, with database leases and explicit source allowlists.

## Recovery and safety

Back up Neon data and retain migration/checkpoint history. Establish an
operational restore test before public launch. Source refresh must preserve
canonical evidence and prior versions, and must never auto-publish imported
records. Configuration changes after initial installation require explicit
review; bootstrapping intentionally refuses to silently overwrite an
installed registry configuration with a different schema version.
