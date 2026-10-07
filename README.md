# Smart Cities Surveillance Registry

A public transparency and accountability application for documenting smart-city surveillance deployments, technologies, agencies, vendors, governing policies, authorizations, procurements, audits, incidents, data-sharing arrangements, and related public records.

This repository is a **downstream application** of the [Civic Registry & Transparency Engine](https://github.com/neophilism/Civic-Registry-Transparency-Engine). The reusable engine remains domain-neutral in its own repository; Smart-Cities-specific schemas, adapters, presentation, and integrations live here.

## Current milestone

**PR 2 — Surveillance registry domain schema**

PR 2 defines the canonical application vocabulary in `config/registry.yaml`:

- surveillance deployments;
- surveillance technologies;
- public agencies;
- vendors;
- policies and laws;
- approvals and authorizations;
- procurements and contracts;
- audits and assessments;
- violations and incidents; and
- data-sharing arrangements.

The schema includes typed public-accountability fields for jurisdiction, status, purpose, capabilities, data categories, retention, sharing, legal process, approvals, procurements, oversight findings, remediation, and public source links.

Relationships are intentionally deferred to PR 3. Publication workflow, deadlines, evidence, and demonstration records remain separate later milestones.

See [Smart Cities domain schema](docs/DOMAIN-SCHEMA.md).

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
