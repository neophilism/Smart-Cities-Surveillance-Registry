# Architecture

## Repository role

Smart Cities Surveillance Registry is a downstream application built from the
domain-neutral Civic Registry & Transparency Engine.

The application carries a local snapshot of the reusable engine packages so it
can be deployed, tested, and evolved independently. The upstream commit used
for the initial snapshot is recorded in `UPSTREAM_ENGINE_COMMIT` and
`docs/UPSTREAM-ENGINE.md`.

## Boundary

Reusable infrastructure remains generic:

- canonical record storage and validation;
- publication lifecycle and disclosure;
- search and relationship graphs;
- evidence and document handling;
- deadlines and notifications;
- ingestion and source-refresh orchestration;
- audit history and integrity;
- public API/export contracts; and
- administrator operations.

Smart-Cities-specific behavior belongs in this repository:

- surveillance deployment and technology schemas;
- agency, vendor, procurement, policy, audit, and violation terminology;
- source-specific adapters;
- public-safe operational-security policy;
- jurisdiction and mapping behavior;
- Smart Cities public presentation; and
- Compliance Engine projections.

## Upstream contribution rule

When this application needs a capability that is broadly reusable, implement it
in domain-neutral terms and contribute or port that capability upstream rather
than teaching the core engine Smart Cities vocabulary.

## Current structure

```text
apps/
  web/                 Smart Cities public/admin application

packages/
  api/                 Reusable public API contracts
  config/              Registry configuration engine
  core/                Generic domain primitives
  database/            Persistence, migrations, audit and operations
  deadlines/           Generic deadline engine
  documents/           Evidence document storage and PDF extraction
  ingestion/           Structured ingestion
  registry/            Generic public presentation helpers
  sdk/                 External TypeScript client
  search/              Search abstraction
  source-adapters/     Safe provider-neutral retrieval primitives

examples/
  generic-registry/    Temporary engine smoke-test configuration
```

The generic example remains during bootstrap so inherited engine behavior can be
validated before the Smart Cities schema is introduced in PR 2.
