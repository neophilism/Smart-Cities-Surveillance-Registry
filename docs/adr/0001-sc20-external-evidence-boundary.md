# ADR 0001: External accountability evidence boundary

Status: accepted for SC-20 implementation.

## Context

Smart Cities is downstream of the generic Civic Registry engine. An outside
provider may assert authorization, accountability or audit facts, but those
facts are not publication decisions, verified compliance or Federal Encryption
Compliance certification. A provider credential must not become an
administrator role.

## Decision

Keep provider validation, machine authorization, import orchestration and
private claim storage in the Smart Cities compliance package. The shared
database package retains its generic exports. Migration 0016 creates
application-specific claim and import-audit tables because this repository's
migration runner owns its downstream database schema. The provider API is
versioned, tenant and provider scoped, bounded, and requires a separate
server-configured bearer token. Duplicate source assertions are immutable
and retried imports are idempotent. A reviewer sees claims only in the
authenticated administrator view; no automatic public projection or lifecycle
approval follows from an imported assertion.

## Verification and recovery

The SC-20 source review identified an accidental truncation of the generic
database export barrel at commit c547528c. It was restored at c4edabbc and
returned to its generic-only form at b828e6cb. That source defect was a
concrete explanation for the earlier build failures; exact error lines from
those CI jobs were unavailable through Boardroom. Current-head CI must still
pass before marking the PR ready or merging it.
