# Smart Cities v1 release evidence and operator handoff

**Status: not verified for production release.** This checklist distinguishes source implementation, automated verification, human approvals, deployment and observed production behavior. Open draft PRs are not merged features.

## Required evidence before release

- Approved roadmap and mapped pull requests: cross-check the immutable source registry, exact GitHub PR heads and CI jobs.
- Database migrations and integrity: execute and record migration, restore, authorization and disclosure controls with an isolated test database.
- Public boundaries: verify cross-registry denial, withheld/redacted field exclusion from API, exports, feeds and analytics, and proper role enforcement.
- Ingestion provenance: record official source URL, retrieval time, output hash, draft-review state, freshness thresholds and failed-run recovery.
- Access: keyboard navigation and screen-reader checks; document device/browser support and outstanding defects.
- Runtime: link a tested deployable image to the exact released commit, health/ready evidence, API/OpenAPI responses, rollback readiness and monitoring.
- Security: run AI-assisted threat and dependency assessment; mark independent human review as deferred if absent without falsely asserting certification.
- Owner-gated production changes: obtain only genuine owner action when credentials, money, deployment permissions or irreversible release approval are required.

## Open change packages needing integration

- SC-19: publication review console and server decision validation are unfinished.
- SC-20: scoped external claim validation exists in draft PR #34; provider API/auth/audit persistence still missing.
- SC-21: sourced retention/deletion projection in draft PR #35; no proof of physical deletion or live UI.
- SC-22: CSV formula hardening in draft PR #36; complete exports/OpenAPI contract verification pending.
- SC-23: public feed route blocked by Boardroom dynamic-path write validation; no merged implementation.
- SC-24: freshness projection in draft PR #37; production observations/UI missing.
- SC-25: uncited analytics metric in draft PR #38; UI route edit blocked by path validation.
- SC-26: public API security headers in draft PR #39; security acceptance not complete.
- SC-27: keyboard accessibility patch in draft PR #40; manual assistive verification pending.
- SC-28: readiness probe and runbook in draft PR #41; no production deploy verified.
- SC-29: read-only release smoke in draft PR #42; full E2E and production validation pending.
- SC-30: documentation only; a source document cannot certify or trigger release.

This is a dated implementation handoff, not a certification or declaration of a working production deployment. Verify all PR states anew before relying on this report.

## Recovery procedure

Reconcile mapped PR heads and actual required checks. Classify failures from runner diagnostics. Make narrow commits through approved source controls, then rerun current-head checks. Hold PRs as draft while acceptance is incomplete. A pending test, missing provider credential, or blocked path should be checkpointed and yielded to an independent eligible task. Do not bypass required checks or production approval.
