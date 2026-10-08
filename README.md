# Smart Cities Surveillance Registry

A public transparency and accountability application for documenting smart-city surveillance deployments, technologies, agencies, vendors, governing policies, authorizations, procurements, audits, incidents, data-sharing arrangements, and related public records.

This repository is a **downstream application** of the [Civic Registry & Transparency Engine](https://github.com/neophilism/Civic-Registry-Transparency-Engine). The reusable engine remains domain-neutral in its own repository; Smart-Cities-specific schemas, adapters, presentation, and integrations live here.

## Current milestone

**PR 7 — Public-safe data and operational-security boundary**

PR 7 adds a Smart Cities-specific safety boundary that prevents obvious
operational or person-level surveillance data from reaching public surfaces.

It includes:

- administrator pre-publication scanning;
- a database publication guard scoped to this registry;
- disclosure-aware redaction/withholding behavior;
- blocked removal of disclosure protection when unsafe canonical data remains;
- fail-safe public placeholders for unsafe legacy records;
- suppression of unsafe evidence/history metadata; and
- regression coverage for precise coordinates, private network topology, MAC
  addresses, credentials/private keys, individual target IDs, raw plate or
  biometric identifiers, and sensitive external identifiers.

High-level accountability categories remain publishable; raw operational detail
does not.

See [Smart Cities public-safety boundary](docs/PUBLIC-SAFETY-BOUNDARY.md).

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
