# Smart Cities Surveillance Registry — recovered complete development plan

**Provenance:** Original October 7 original approved standalone thirty-PR plan after separation from the generic Civic Registry. **30 original milestone titles recovered**, mapped in original order. Scopes and acceptance criteria below are a careful synthesis of the original conversations and existing repository architecture; they are **not** a verbatim export of the old chat. This is the historical approved scope plus explicit subsequent amendments, not a declaration that unmerged tasks are complete.

## Purpose / product boundary

Public-facing, carefully sourced registry of surveillance technologies, deployments, agencies, vendors, procurement, purpose/data use, warrants/policies, retention/sharing obligations, oversight, findings and changes. A distinct thin product on Civic Registry & Transparency Engine. Distinguish factual public sourcing, editor assertions, projected rules, and synthetic demonstrations; do not present private/operational surveillance details as facts.

## Original milestone-by-milestone plan

### SC-01 — Bootstrap, upstream provenance and CI

- **Scope:** Separate app shell, pin generic registry upstream, build/test/deploy baseline and documented architecture.
- **Dependencies:** None
- **Acceptance:** Tests must cover normal authorized operation, invalid inputs, cross-role/tenant access denial, audit/provenance preservation, retries/duplicates where applicable, and at least one documented failure/recovery case. UI milestones require keyboard and screen reader checks. Never equate mocked fixture or document with real-world ingestion, compliance, or production.

### SC-02 — Smart Cities entity schema

- **Scope:** Define technologies, deployments, owners, vendors, purposes, datasets, approvals, policies and jurisdictions as downstream configured types.
- **Dependencies:** Prior data model, APIs, state transitions or provider integrations on which the feature depends; verify concrete dependency against current source.
- **Acceptance:** Tests must cover normal authorized operation, invalid inputs, cross-role/tenant access denial, audit/provenance preservation, retries/duplicates where applicable, and at least one documented failure/recovery case. UI milestones require keyboard and screen reader checks. Never equate mocked fixture or document with real-world ingestion, compliance, or production.

### SC-03 — Accountability relationship graph

- **Scope:** Links from deployments to agency, vendor, procurement, rules, disclosure records, oversight and historical evidence.
- **Dependencies:** Prior data model, APIs, state transitions or provider integrations on which the feature depends; verify concrete dependency against current source.
- **Acceptance:** Tests must cover normal authorized operation, invalid inputs, cross-role/tenant access denial, audit/provenance preservation, retries/duplicates where applicable, and at least one documented failure/recovery case. UI milestones require keyboard and screen reader checks. Never equate mocked fixture or document with real-world ingestion, compliance, or production.

### SC-04 — Publication/disclosure policy

- **Scope:** Define public-safe views, provenance, redaction, review and confidential-source boundaries.
- **Dependencies:** Prior data model, APIs, state transitions or provider integrations on which the feature depends; verify concrete dependency against current source.
- **Acceptance:** Tests must cover normal authorized operation, invalid inputs, cross-role/tenant access denial, audit/provenance preservation, retries/duplicates where applicable, and at least one documented failure/recovery case. UI milestones require keyboard and screen reader checks. Never equate mocked fixture or document with real-world ingestion, compliance, or production.

### SC-05 — Accountability deadlines

- **Scope:** Configurable disclosure, assessment, renewal and follow-up clocks without hardcoded enforcement claims.
- **Dependencies:** Prior data model, APIs, state transitions or provider integrations on which the feature depends; verify concrete dependency against current source.
- **Acceptance:** Tests must cover normal authorized operation, invalid inputs, cross-role/tenant access denial, audit/provenance preservation, retries/duplicates where applicable, and at least one documented failure/recovery case. UI milestones require keyboard and screen reader checks. Never equate mocked fixture or document with real-world ingestion, compliance, or production.

### SC-06 — Primary-source evidence model

- **Scope:** Citations, immutable document versions, hashes, jurisdiction and source URLs with correction history.
- **Dependencies:** Prior data model, APIs, state transitions or provider integrations on which the feature depends; verify concrete dependency against current source.
- **Acceptance:** Tests must cover normal authorized operation, invalid inputs, cross-role/tenant access denial, audit/provenance preservation, retries/duplicates where applicable, and at least one documented failure/recovery case. UI milestones require keyboard and screen reader checks. Never equate mocked fixture or document with real-world ingestion, compliance, or production.

### SC-07 — Public-safety boundary

- **Scope:** Policy preventing publication of sensitive tactics, credentials, exact clandestine site details or personal information.
- **Dependencies:** Prior data model, APIs, state transitions or provider integrations on which the feature depends; verify concrete dependency against current source.
- **Acceptance:** Tests must cover normal authorized operation, invalid inputs, cross-role/tenant access denial, audit/provenance preservation, retries/duplicates where applicable, and at least one documented failure/recovery case. UI milestones require keyboard and screen reader checks. Never equate mocked fixture or document with real-world ingestion, compliance, or production.

### SC-08 — Synthetic demonstration dataset

- **Scope:** Clearly marked sample records covering multiple technologies, vendor relationships and lifecycle states.
- **Dependencies:** Prior data model, APIs, state transitions or provider integrations on which the feature depends; verify concrete dependency against current source.
- **Acceptance:** Tests must cover normal authorized operation, invalid inputs, cross-role/tenant access denial, audit/provenance preservation, retries/duplicates where applicable, and at least one documented failure/recovery case. UI milestones require keyboard and screen reader checks. Never equate mocked fixture or document with real-world ingestion, compliance, or production.

### SC-09 — Public homepage and navigation

- **Scope:** Attractive nontechnical homepage, methodology, explorer and terminology guide.
- **Dependencies:** Prior data model, APIs, state transitions or provider integrations on which the feature depends; verify concrete dependency against current source.
- **Acceptance:** Tests must cover normal authorized operation, invalid inputs, cross-role/tenant access denial, audit/provenance preservation, retries/duplicates where applicable, and at least one documented failure/recovery case. UI milestones require keyboard and screen reader checks. Never equate mocked fixture or document with real-world ingestion, compliance, or production.

### SC-10 — Deployment and technology pages

- **Scope:** Public technology and deployment details, timelines, evidence, permitted-use and public-safe labels.
- **Dependencies:** Prior data model, APIs, state transitions or provider integrations on which the feature depends; verify concrete dependency against current source.
- **Acceptance:** Tests must cover normal authorized operation, invalid inputs, cross-role/tenant access denial, audit/provenance preservation, retries/duplicates where applicable, and at least one documented failure/recovery case. UI milestones require keyboard and screen reader checks. Never equate mocked fixture or document with real-world ingestion, compliance, or production.

### SC-11 — Agency, vendor and procurement pages

- **Scope:** Agency and supplier profiles, procurement relationships, citations and accountability links.
- **Dependencies:** Prior data model, APIs, state transitions or provider integrations on which the feature depends; verify concrete dependency against current source.
- **Acceptance:** Tests must cover normal authorized operation, invalid inputs, cross-role/tenant access denial, audit/provenance preservation, retries/duplicates where applicable, and at least one documented failure/recovery case. UI milestones require keyboard and screen reader checks. Never equate mocked fixture or document with real-world ingestion, compliance, or production.

### SC-12 — Policy, approval, audit and violation pages

- **Scope:** Reviewable legal/policy context, approvals/expiration, audits, reported incidents, findings and provenance.
- **Dependencies:** Prior data model, APIs, state transitions or provider integrations on which the feature depends; verify concrete dependency against current source.
- **Acceptance:** Tests must cover normal authorized operation, invalid inputs, cross-role/tenant access denial, audit/provenance preservation, retries/duplicates where applicable, and at least one documented failure/recovery case. UI milestones require keyboard and screen reader checks. Never equate mocked fixture or document with real-world ingestion, compliance, or production.

### SC-13 — Advanced search and filtering

- **Scope:** Search by technology, geography, agency, vendor, purpose, status and evidence type.
- **Dependencies:** Prior data model, APIs, state transitions or provider integrations on which the feature depends; verify concrete dependency against current source.
- **Acceptance:** Tests must cover normal authorized operation, invalid inputs, cross-role/tenant access denial, audit/provenance preservation, retries/duplicates where applicable, and at least one documented failure/recovery case. UI milestones require keyboard and screen reader checks. Never equate mocked fixture or document with real-world ingestion, compliance, or production.

### SC-14 — Jurisdiction explorer and safe mapping

- **Scope:** Accessible region views, no unsafe precise operational location disclosures.
- **Dependencies:** Prior data model, APIs, state transitions or provider integrations on which the feature depends; verify concrete dependency against current source.
- **Acceptance:** Tests must cover normal authorized operation, invalid inputs, cross-role/tenant access denial, audit/provenance preservation, retries/duplicates where applicable, and at least one documented failure/recovery case. UI milestones require keyboard and screen reader checks. Never equate mocked fixture or document with real-world ingestion, compliance, or production.

### SC-15 — Structured source ingestion

- **Scope:** Parse, deduplicate, validate and quarantine external records before publication.
- **Dependencies:** Prior data model, APIs, state transitions or provider integrations on which the feature depends; verify concrete dependency against current source.
- **Acceptance:** Tests must cover normal authorized operation, invalid inputs, cross-role/tenant access denial, audit/provenance preservation, retries/duplicates where applicable, and at least one documented failure/recovery case. UI milestones require keyboard and screen reader checks. Never equate mocked fixture or document with real-world ingestion, compliance, or production.

### SC-16 — Official-source adapters

- **Scope:** Approved municipal, state, federal procurement and oversight source connectors with provenance.
- **Dependencies:** Prior data model, APIs, state transitions or provider integrations on which the feature depends; verify concrete dependency against current source.
- **Acceptance:** Tests must cover normal authorized operation, invalid inputs, cross-role/tenant access denial, audit/provenance preservation, retries/duplicates where applicable, and at least one documented failure/recovery case. UI milestones require keyboard and screen reader checks. Never equate mocked fixture or document with real-world ingestion, compliance, or production.

### SC-17 — PDF attachment extraction

- **Scope:** Documents, attachments, OCR where necessary, citation anchors and unsupported-format handling.
- **Dependencies:** Prior data model, APIs, state transitions or provider integrations on which the feature depends; verify concrete dependency against current source.
- **Acceptance:** Tests must cover normal authorized operation, invalid inputs, cross-role/tenant access denial, audit/provenance preservation, retries/duplicates where applicable, and at least one documented failure/recovery case. UI milestones require keyboard and screen reader checks. Never equate mocked fixture or document with real-world ingestion, compliance, or production.

### SC-18 — Entity matching

- **Scope:** Evidence-backed agency/vendor/technology resolution with human override and confidence flags.
- **Dependencies:** Prior data model, APIs, state transitions or provider integrations on which the feature depends; verify concrete dependency against current source.
- **Acceptance:** Tests must cover normal authorized operation, invalid inputs, cross-role/tenant access denial, audit/provenance preservation, retries/duplicates where applicable, and at least one documented failure/recovery case. UI milestones require keyboard and screen reader checks. Never equate mocked fixture or document with real-world ingestion, compliance, or production.

### SC-19 — Admin source and publication console

- **Scope:** Queues, corrections, workflow, redactions, evidence checking and approval.
- **Dependencies:** Prior data model, APIs, state transitions or provider integrations on which the feature depends; verify concrete dependency against current source.
- **Acceptance:** Tests must cover normal authorized operation, invalid inputs, cross-role/tenant access denial, audit/provenance preservation, retries/duplicates where applicable, and at least one documented failure/recovery case. UI milestones require keyboard and screen reader checks. Never equate mocked fixture or document with real-world ingestion, compliance, or production.

### SC-20 — Cross-engine compliance API integration

- **Scope:** Optional external authorization/accountability facts supplied through explicit APIs; never conflate with Federal Encryption Compliance.
- **Dependencies:** Prior data model, APIs, state transitions or provider integrations on which the feature depends; verify concrete dependency against current source.
- **Acceptance:** Tests must cover normal authorized operation, invalid inputs, cross-role/tenant access denial, audit/provenance preservation, retries/duplicates where applicable, and at least one documented failure/recovery case. UI milestones require keyboard and screen reader checks. Never equate mocked fixture or document with real-world ingestion, compliance, or production.

### SC-21 — Retention/deletion projection

- **Scope:** Display externally sourced obligation, policy and measured fulfillment with source/time; no unverified claim of actual deletion.
- **Dependencies:** Prior data model, APIs, state transitions or provider integrations on which the feature depends; verify concrete dependency against current source.
- **Acceptance:** Tests must cover normal authorized operation, invalid inputs, cross-role/tenant access denial, audit/provenance preservation, retries/duplicates where applicable, and at least one documented failure/recovery case. UI milestones require keyboard and screen reader checks. Never equate mocked fixture or document with real-world ingestion, compliance, or production.

### SC-22 — OpenAPI and exports

- **Scope:** Public, versioned, safe API and documented exports.
- **Dependencies:** Prior data model, APIs, state transitions or provider integrations on which the feature depends; verify concrete dependency against current source.
- **Acceptance:** Tests must cover normal authorized operation, invalid inputs, cross-role/tenant access denial, audit/provenance preservation, retries/duplicates where applicable, and at least one documented failure/recovery case. UI milestones require keyboard and screen reader checks. Never equate mocked fixture or document with real-world ingestion, compliance, or production.

### SC-23 — Feeds and subscriptions

- **Scope:** Public follow/notification controls for record and policy changes.
- **Dependencies:** Prior data model, APIs, state transitions or provider integrations on which the feature depends; verify concrete dependency against current source.
- **Acceptance:** Tests must cover normal authorized operation, invalid inputs, cross-role/tenant access denial, audit/provenance preservation, retries/duplicates where applicable, and at least one documented failure/recovery case. UI milestones require keyboard and screen reader checks. Never equate mocked fixture or document with real-world ingestion, compliance, or production.

### SC-24 — Freshness and provenance monitoring

- **Scope:** Track stale adapters, source check dates, missing references, correction rate and ingestion failures.
- **Dependencies:** Prior data model, APIs, state transitions or provider integrations on which the feature depends; verify concrete dependency against current source.
- **Acceptance:** Tests must cover normal authorized operation, invalid inputs, cross-role/tenant access denial, audit/provenance preservation, retries/duplicates where applicable, and at least one documented failure/recovery case. UI milestones require keyboard and screen reader checks. Never equate mocked fixture or document with real-world ingestion, compliance, or production.

### SC-25 — Transparency analytics

- **Scope:** Aggregated counts and trends, disclosure timeliness, citation coverage and public-safe comparisons.
- **Dependencies:** Prior data model, APIs, state transitions or provider integrations on which the feature depends; verify concrete dependency against current source.
- **Acceptance:** Tests must cover normal authorized operation, invalid inputs, cross-role/tenant access denial, audit/provenance preservation, retries/duplicates where applicable, and at least one documented failure/recovery case. UI milestones require keyboard and screen reader checks. Never equate mocked fixture or document with real-world ingestion, compliance, or production.

### SC-26 — Security hardening

- **Scope:** Threat model, scope/role policies, sensitive disclosure adversarial tests, uploads, rate limit and audit.
- **Dependencies:** Prior data model, APIs, state transitions or provider integrations on which the feature depends; verify concrete dependency against current source.
- **Acceptance:** Tests must cover normal authorized operation, invalid inputs, cross-role/tenant access denial, audit/provenance preservation, retries/duplicates where applicable, and at least one documented failure/recovery case. UI milestones require keyboard and screen reader checks. Never equate mocked fixture or document with real-world ingestion, compliance, or production.

### SC-27 — Accessibility and performance

- **Scope:** Keyboard/screen-reader usability, long lists/search responsive UX, load tests and caching.
- **Dependencies:** Prior data model, APIs, state transitions or provider integrations on which the feature depends; verify concrete dependency against current source.
- **Acceptance:** Tests must cover normal authorized operation, invalid inputs, cross-role/tenant access denial, audit/provenance preservation, retries/duplicates where applicable, and at least one documented failure/recovery case. UI milestones require keyboard and screen reader checks. Never equate mocked fixture or document with real-world ingestion, compliance, or production.

### SC-28 — Production operations

- **Scope:** Document Render/Neon migrations, jobs, backups/recovery, dashboards and alerts.
- **Dependencies:** Prior data model, APIs, state transitions or provider integrations on which the feature depends; verify concrete dependency against current source.
- **Acceptance:** Tests must cover normal authorized operation, invalid inputs, cross-role/tenant access denial, audit/provenance preservation, retries/duplicates where applicable, and at least one documented failure/recovery case. UI milestones require keyboard and screen reader checks. Never equate mocked fixture or document with real-world ingestion, compliance, or production.

### SC-29 — End-to-end release readiness

- **Scope:** Source-to-publication workflow including negative tests, representative real-source samples and rollback.
- **Dependencies:** Prior data model, APIs, state transitions or provider integrations on which the feature depends; verify concrete dependency against current source.
- **Acceptance:** Tests must cover normal authorized operation, invalid inputs, cross-role/tenant access denial, audit/provenance preservation, retries/duplicates where applicable, and at least one documented failure/recovery case. UI milestones require keyboard and screen reader checks. Never equate mocked fixture or document with real-world ingestion, compliance, or production.

### SC-30 — Documentation and v1 release

- **Scope:** Public methodology, operator guide, data limitations, deployment/runbook, release and ownership.
- **Dependencies:** Prior data model, APIs, state transitions or provider integrations on which the feature depends; verify concrete dependency against current source.
- **Acceptance:** Tests must cover normal authorized operation, invalid inputs, cross-role/tenant access denial, audit/provenance preservation, retries/duplicates where applicable, and at least one documented failure/recovery case. UI milestones require keyboard and screen reader checks. Never equate mocked fixture or document with real-world ingestion, compliance, or production.

## Approved changes and scope cautions

**Architecture correction:** Smart Cities belongs downstream of **Civic Registry & Transparency Engine**, not Federal Encryption Compliance. It may consume additional compliance outputs only by a deliberate versioned API integration. The originally proposed PR20/21 integration must not create hidden cross-engine coupling. The current repository contains substantial implementation docs; check merged PR status rather than assuming these 30 are all unfinished.

## Authoritative implementation references

Read these current repository documents before coding; they may describe later improvements that are not reflected in the original 2026 roadmap:

- [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)
- [docs/DOMAIN-SCHEMA.md](../docs/DOMAIN-SCHEMA.md)
- [docs/PUBLIC-SAFETY-BOUNDARY.md](../docs/PUBLIC-SAFETY-BOUNDARY.md)
- [docs/PUBLIC-HOMEPAGE.md](../docs/PUBLIC-HOMEPAGE.md)
- [docs/PRIMARY-SOURCE-EVIDENCE.md](../docs/PRIMARY-SOURCE-EVIDENCE.md)
- [docs/OFFICIAL-SOURCE-REFRESH.md](../docs/OFFICIAL-SOURCE-REFRESH.md)
- [docs/ENGINE-ROOM-MONITORING.md](../docs/ENGINE-ROOM-MONITORING.md)
- [docs/PRODUCTION-DEPLOYMENT.md](../docs/PRODUCTION-DEPLOYMENT.md)

## Cross-account execution handoff

1. Read this file and the linked architecture/API/source documents; inspect latest `main` and the actual GitHub PR list, CI workflow results, branch protection, release tags, migration heads, and deployment environment.
2. Associate the stable SC-01..SC-30 **roadmap IDs**, not GitHub PR numbers, with actual merged code commits. Record source-of-truth mapping and add new approved roadmap versions for requirements added after this original plan.
3. Work from the first demonstrably incomplete milestone and dependencies. Preserve current downstream/core separation. Implement in reviewable PRs with regression tests, docs and deployment checks; chain healthy PRs when permitted.
4. Keep Engine Room milestone progress evidence separate from deployed/production state. Real source data needs source URL/date/validation; synthetic fixtures stay unmistakably labeled.
5. Only raise the user's attention for a material product/rights decision, missing deployment credentials/privileges, or blockers tests reveal—not routine implementation questions.

## Recovery confidence

**Full original numbered milestone sequence recovered**, with technical scope and acceptance expanded from available evidence. Precise verbatim wording and the present code→plan mapping still require a separate live reconciliation pass.
