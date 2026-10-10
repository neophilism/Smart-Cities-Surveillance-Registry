# Approved official-source refresh worker

The executable Smart Cities worker connects the source adapters introduced
in PR 16 with the generic engine's PostgreSQL refresh leasing, ingestion,
source fingerprints, reviewable drafts, retries, stale status, and audit runs.

## Fail-closed catalog

Source selection is explicitly defined in `config/official-sources.json`.
This file defaults to an empty sources array; creating the file is **not**
equivalent to activating a production feed. For each entry, review and commit:

- a stable lowercase source ID and `enabled` boolean;
- one of `socrata`, `arcgis`, `ckan`, `procurement`, `html-catalog`;
- the exact HTTPS source endpoint and approved host allowlist;
- adapter field mappings with stable record identities;
- a domain-valid `ingestionProfile` with `mode: upsert`, `status: draft`,
  and no lifecycle bootstrapping;
- bounded refresh interval and stale-after thresholds.

The worker rejects non-allowlisted origins, credentials embedded in URLs,
invalid catalog versions, duplicate source IDs, and attempts to auto-publish.

## Production scheduler

The opt-in GitHub Actions workflow runs hourly, enabled only after setting
the GitHub repository variable `SMART_CITIES_REFRESH_ENABLED=true`.
It also requires the GitHub Actions secret `SMART_CITIES_DATABASE_URL`
(Neon connection string). Do not place credentials in the committed catalog.
GitHub's scheduler is best effort, not a precise real-time worker.

A dedicated always-on worker can alternatively execute:

```bash
pnpm db:refresh-official
```

The command reads `config/official-sources.json`, syncs the approved jobs,
uses PostgreSQL leases to avoid overlapping execution, and records actual
collection outcomes. Every imported record stays a draft for editorial review.
A synthetic test suite verifies that the catalog refuses unsafe configuration.

## Important limitations

The repository does not yet contain a reviewed, enabled production-source
mapping. Accordingly this worker **does not currently fetch real government
data**. Live source onboarding must begin with verified official fields,
schema mapping, and an observed dry-run/ingestion validation.

Document attachment metadata from an adapter does not automatically mean the
corresponding PDF bytes were archived. PDF ingestion must wait for durable
evidence storage; do not rely on a free Render instance's ephemeral disk.

## Monitoring

Review `source_refresh_jobs` and `source_refresh_runs` in the protected
administrator console and collect health/readiness signals in Engine Room.
Alerts should report failing, stale, or never-run enabled sources separately
from public record totals. Ingestion errors are operator issues, never an
instruction to publish incomplete records.
