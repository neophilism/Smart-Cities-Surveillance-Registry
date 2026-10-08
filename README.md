# Smart Cities Surveillance Registry

A public transparency and accountability application for documenting smart-city surveillance deployments, technologies, agencies, vendors, governing policies, authorizations, procurements, audits, incidents, data-sharing arrangements, and related public records.

This repository is a **downstream application** of the [Civic Registry & Transparency Engine](https://github.com/neophilism/Civic-Registry-Transparency-Engine). The reusable engine remains domain-neutral in its own repository; Smart-Cities-specific schemas, adapters, presentation, and integrations live here.

## Current milestone

**PR 10 — Deployment and technology pages**

PR 10 adds purpose-built public accountability summaries for the two core
surveillance record types.

Deployment pages now foreground:

- approved purpose and public location scope;
- data collection, retention, sharing, and legal-process rules;
- operating agency and deployed technology;
- vendors reached through the public accountability graph;
- authorizations, policies, procurement, audits, incidents, and data sharing;
- public evidence count; and
- public deadline count.

Technology pages now foreground capabilities, data categories, real-time /
biometric / automated-decision features, suppliers, deployments, and
procurements.

The generic details, evidence, history, deadlines, relationship browser, and
relationship map remain available underneath.

See [Deployment and technology pages](docs/DEPLOYMENT-TECHNOLOGY-PAGES.md).

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
