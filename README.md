# Smart Cities Surveillance Registry

A public transparency and accountability application for documenting smart-city surveillance deployments, technologies, agencies, vendors, governing policies, authorizations, procurements, audits, incidents, data-sharing arrangements, and related public records.

This repository is a **downstream application** of the [Civic Registry & Transparency Engine](https://github.com/neophilism/Civic-Registry-Transparency-Engine). The reusable engine remains domain-neutral in its own repository; Smart-Cities-specific schemas, adapters, presentation, and integrations live here.

## Current milestone

**PR 3 — Relationship and accountability graph**

PR 3 connects the canonical Smart Cities records into a typed accountability
graph. It defines 19 directed relationship types covering:

- deployment → technology → vendor;
- deployment → operating agency;
- deployment → authorization → issuing agency;
- deployment → governing policy → issuing agency;
- deployment → procurement → agency/vendor/technology;
- audit → deployment and conducting agency;
- violation/incident → deployment and identifying audit; and
- data-sharing arrangement → deployment, source agency, recipient agency, and
  governing policy.

The engine's existing bounded, visibility-aware graph traversal is reused
unchanged. Application-specific tests verify endpoint enforcement and real
multi-hop traversal in PostgreSQL.

See [Smart Cities accountability graph](docs/ACCOUNTABILITY-GRAPH.md).

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
