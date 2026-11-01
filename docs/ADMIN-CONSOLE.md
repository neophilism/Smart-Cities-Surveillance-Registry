# Administrator console

PR 15 adds a restricted operator surface at `/admin`.

## Security boundary

The public site and `/api/v1` remain disclosure-filtered, read-only
surfaces. The administrator console is intentionally an internal view of
canonical records and operational state.

The console is disabled unless the server has a signing secret (at least 32
characters) and a nonempty, valid `CIVIC_REGISTRY_ADMIN_PRINCIPALS` JSON array.
Use a new `CIVIC_REGISTRY_ADMIN_SESSION_SECRET` for the signing key, separate from
all operator credentials. `CIVIC_REGISTRY_ADMIN_TOKEN` is retired and ignored.

Each principal contains `actorId`, `roles` (an array of lifecycle-role strings),
and `tokenSha256` (the lowercase hex SHA-256 digest of that operator's token).
Generate a distinct cryptographically random token of at least 32 bytes per
operator, store its digest in server configuration, and deliver the token through
your existing secret-management process. Never commit tokens, digests of actual
credentials, or signing keys. Duplicate actors/digests and malformed configuration
disable the built-in login rather than choosing an ambiguous identity.

The form accepts only the operator token. It cannot choose actor ID or roles.
Every session read revalidates the current server principal and its fingerprint;
removing an operator, changing roles, rotating their credential, or rotating the
signing key revokes their cookies. Legacy self-declared-role cookies are rejected.
Cookies remain signed, HTTP-only, SameSite=Strict, secure in production, with an
eight-hour expiry. Reconfiguration requires operators to sign in again.

All configured principals are trusted **cross-registry console administrators**,
including canonical record editing. Lifecycle roles constrain workflow transitions
and approvals; they are not general per-tenant or read-only console permissions.
Do not enroll tenant-limited users in this global administrator console. The public
read-only API remains the disclosure-safe surface for unauthenticated users.

A bounded per-process sign-in limiter permits 30 attempts per minute, including
successful attempts, then recovers at the next window. Replicas/restarts have
independent limits. Production ingress must additionally enforce distributed
rate limits and organization SSO/VPN/proxy access. No deployment or identity-proxy
configuration is claimed by this source change.

## Capabilities

The console provides:

- cross-registry operational summaries;
- canonical record creation and schema-driven editing;
- lifecycle transition requests and approval decisions;
- open and overdue deadline views plus deadline state actions;
- deadline reconciliation;
- recent ingestion-run visibility and item-level ingestion failures;
- source listing and source creation;
- immutable record revision and audit-event inspection;
- installed registry configuration validation.

Record status is never edited directly for lifecycle-managed registries.
Status changes go through `PostgresPublicationLifecycleService`.

Record fields are generated from the compiled registry schema and record
writes continue through `PostgresRecordRepository`, which runs the normal
domain/config validation and deadline reconciliation.

## Auditing

The console supplies operator context to lifecycle and deadline services.\nRecord writes pass actor/reason context through the record repository on the\nsame PostgreSQL transaction that fires the immutable history trigger, so\nrecord revisions and audit events are attributed without relying on pooled\nconnection state.

## Deliberate exclusions

PR 15 does not add a browser-based arbitrary registry-configuration editor or
raw SQL/debug console. Registry configuration remains a deployable,
reviewable artifact. This avoids turning the administrator UI into a path for
unreviewed schema/workflow changes.

The console also does not expose or weaken the public API disclosure boundary.
