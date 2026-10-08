# Smart Cities structured ingestion

PR 15 adds downstream ingestion profiles for the principal Smart Cities source
record types without changing the generic ingestion engine.

## Included profiles

The application includes four ready-to-adapt profiles:

- `deployments.yaml` — surveillance deployments;
- `policies.yaml` — policies and laws;
- `procurements.yaml` — contracts and procurements; and
- `audits.yaml` — audits and assessments.

Example inputs demonstrate all supported structured formats:

- deployment CSV;
- policy JSON;
- procurement NDJSON; and
- audit JSON.

## Review-first lifecycle

All Smart Cities profiles create records in:

```text
draft
```

They do not enable lifecycle bootstrapping.

This means an external feed can create or refresh a reviewable record, but it
cannot publish around the PR 4 review/approval workflow.

## Provenance

Every ingestion run preserves:

- source label;
- source URI when supplied;
- whole-input SHA-256;
- per-row source key;
- per-row input fingerprint;
- profile ID;
- actor and reason when supplied;
- durable per-row outcome; and
- a private ingestion audit event attached to the affected record.

## Upserts and immutable history

Profiles use `upsert` mode.

When a source row changes:

- the existing record is updated;
- configured fields outside the profile are preserved unless replacement is
  explicitly enabled;
- the immutable record-version history preserves the prior snapshot; and
- an `ingestion.record_updated` audit event records the run/profile/source
  provenance.

When a source row is unchanged, the run records an `unchanged` outcome rather
than creating another revision.

## CLI examples

After installing the Smart Cities registry configuration:

```bash
pnpm db:ingest \
  smart-cities-surveillance-registry \
  examples/smart-cities-ingestion/deployments.yaml \
  examples/smart-cities-ingestion/deployments.csv \
  csv
```

```bash
pnpm db:ingest \
  smart-cities-surveillance-registry \
  examples/smart-cities-ingestion/policies.yaml \
  examples/smart-cities-ingestion/policies.json \
  json
```

```bash
pnpm db:ingest \
  smart-cities-surveillance-registry \
  examples/smart-cities-ingestion/procurements.yaml \
  examples/smart-cities-ingestion/procurements.ndjson \
  ndjson
```

The same commands accept `--dry-run` for validation without record mutation.

## Validation

PR 15 tests verify:

- every profile compiles against the downstream Smart Cities schema;
- CSV, JSON, and NDJSON all ingest successfully;
- imported records remain draft/public-review records;
- whole-input and per-row fingerprints are persisted;
- external source identifiers are preserved;
- changed upserts create immutable revisions; and
- ingestion update events preserve profile, actor, source, and fingerprint
  provenance.
