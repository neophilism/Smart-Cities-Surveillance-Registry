# Smart Cities Surveillance Registry

A public transparency and accountability application for documenting smart-city surveillance deployments, technologies, agencies, vendors, governing policies, authorizations, procurements, audits, incidents, data-sharing arrangements, and related public records.

This repository is a **downstream application** of the [Civic Registry & Transparency Engine](https://github.com/neophilism/Civic-Registry-Transparency-Engine). The reusable engine remains domain-neutral in its own repository; Smart-Cities-specific schemas, adapters, presentation, and integrations live here.

## Current milestone

**PR 12 — Policy, authorization, audit, and violation pages**

PR 12 adds purpose-built public accountability summaries for:

- policies and laws, including authority, status, review dates, issuing bodies,
  governed deployments, and governed data sharing;
- authorizations, including approving body, conditions, term, issuer, and
  authorized deployments;
- audits and assessments, including assessor, findings, recommendations,
  affected deployments, identified incidents, and follow-up dates; and
- violations/incidents, including severity, status, remediation, affected
  deployments, identifying audits, evidence, and remediation deadlines.

See [Governance and oversight pages](docs/GOVERNANCE-OVERSIGHT-PAGES.md).

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
