# Smart Cities Surveillance Registry

A public transparency and accountability application for documenting smart-city surveillance deployments, technologies, agencies, vendors, governing policies, authorizations, procurements, audits, incidents, data-sharing arrangements, and related public records.

This repository is a **downstream application** of the [Civic Registry & Transparency Engine](https://github.com/neophilism/Civic-Registry-Transparency-Engine). The reusable engine remains domain-neutral in its own repository; Smart-Cities-specific schemas, adapters, presentation, and integrations live here.

## Current milestone

**PR 6 — Primary-source evidence model**

PR 6 specializes the generic Civic Registry evidence system for Smart Cities:

- source → document → citation provenance chains;
- canonical public URLs and retrieval timestamps;
- archived-document SHA-256 metadata;
- page/section/paragraph/line/fragment locators;
- field-level citations for material public claims;
- a Smart Cities evidence-coverage policy for all ten record types; and
- provenance-quality checks that distinguish a merely attached document from
  evidence that actually supports the populated critical fields.

Representative integration tests cover both a fully sourced deployment and a
procurement whose single attached contract does **not** automatically prove
every populated field.

See [Smart Cities primary-source evidence](docs/PRIMARY-SOURCE-EVIDENCE.md).

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
