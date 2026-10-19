# SC-21 retention/deletion status  source-bound public projection

The retention-projection primitive requires explicit registry/record binding, dated source evidence and declared retention obligations. Invalid states and unsafe/non-HTTPS source URLs are rejected; bounded history rejects mixed records and duplicate observations. A provider's claim, even if marked independently verified in its source record, does not independently establish physical destruction of retained copies.

Public deployment record pages now show only disclosure-projected retention_days and retention_basis fields, with an explicit "physical deletion not verified" notice. GET /api/v1/registries/{registryId}/records/{recordId}/retention returns the same public fields and a non-verified deletion status; it uses existing public disclosure/record visibility controls and never reads raw private values.

This does not introduce private ingestion, source verification, deletion job execution, retention schedules or physical deletion certification. Persisted source observations, authenticated administrator intake, accessibility review and deployed API checks still require separate acceptance evidence. Incomplete evidence remains unknown, not an affirmative deletion claim. These changes remain a development PR until exact-head CI and merge-gate evidence pass.

## Internal persistence and authorization

Migration `0016_retention_observations.sql` creates scoped source observation records with composite record foreign keys and immutable duplicate keys. `PostgresRetentionObservations` uses parameterized SQL and requires an injected record-scoped read/write authorization callback. A false authorization result denies access before SQL executes. The adapter deliberately has no public mutation route, scheduler, transport or unverified deletion side effect. It is only usable by a trusted operator with separately validated source provenance; the authorization callback is not a substitute for authentication or audit logging.

A database integration test uses isolated seeded deployment records to exercise insert idempotency, lookup scoping and foreign-key rejection. This is software evidence only. Applying the migration to a deployed database and exposing authorized operator intake need separate deployment/acceptance work. Public UI/API values continue to come only from disclosed registry record fields, not private raw observations.
