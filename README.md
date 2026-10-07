# Smart Cities Surveillance Registry

A public transparency and accountability application for documenting smart-city surveillance deployments, technologies, agencies, vendors, governing policies, audits, and related public records.

This repository is a **downstream application** of the [Civic Registry & Transparency Engine](https://github.com/neophilism/Civic-Registry-Transparency-Engine). The reusable engine remains domain-neutral in its own repository; Smart-Cities-specific schemas, adapters, presentation, and integrations live here.

## Current milestone

**PR 1 — Bootstrap from the clean Civic Registry & Transparency Engine**

PR 1 establishes:

- the reusable engine packages and database foundation;
- the Next.js public/admin application shell;
- PostgreSQL migrations and local Docker development;
- lint, typecheck, unit, integration, migration, and build CI;
- Smart Cities application identity;
- exact upstream-engine provenance; and
- bootstrap regression coverage.

The Smart Cities domain schema is intentionally **not** introduced in PR 1. That begins in PR 2 so the application boundary is reviewable and incremental.

## Upstream provenance

The initial engine snapshot is pinned to:

```text
Civic Registry & Transparency Engine
commit 49bd3248dc976c6a56fbd2db949ad579579787dd
```

See [Upstream Engine](docs/UPSTREAM-ENGINE.md).

## Local development

```bash
cp .env.example .env
pnpm install
docker compose up -d db
pnpm db:migrate
pnpm dev
```

Then visit `http://localhost:3000`.

Run all quality gates with:

```bash
pnpm ci
```

## Architecture rule

Generic capabilities should remain reusable and, when broadly useful, be generalized upstream in the Civic Registry & Transparency Engine.

Smart-Cities-specific concepts belong here:

- surveillance deployment and technology schemas;
- agency/vendor/procurement terminology;
- official-source adapters;
- public-safety/disclosure policy;
- Smart Cities presentation;
- mapping/jurisdiction behavior; and
- application-specific Compliance Engine projections.
