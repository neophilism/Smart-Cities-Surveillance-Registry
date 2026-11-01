# SC-26 source security review

This is an AI-assisted source and adversarial-test review, not an independent
human audit, certification, live penetration test, or production activation.

## Trust and policy

- Anonymous clients receive public projections only. Canonical values, private
  sources, redacted fields, internal deadlines and private audit events remain
  behind their existing registry/disclosure predicates.
- Console principals are explicitly global administrators, not tenant-scoped
  accounts. Lifecycle role and approval checks remain in the database services.
  Actor/role authority comes from server configuration, never form fields.
- The server signing key is separate from random per-operator credentials.
  Secrets and real credential digests are not fixtures or repository content.
- Imported sources and attachments are untrusted bytes, even on allowed hosts.
  URLs/redirects must be HTTPS, credential-free and adapter-host allowlisted.

## Concrete findings repaired

1. Shared-token login previously signed caller-selected actor IDs and roles.
   The new principal lookup and versioned cookie bind both to server configuration.
   Current configuration is rechecked on every cookie read; revocation and role
   changes invalidate existing sessions. Malformed configuration disables login.
2. Source DNS checks preceded a second independent resolution by `fetch`.
   The default HTTPS transport now connects to the checked IP, retains original
   Host/SNI identity and default certificate verification, disables pooled socket
   reuse, and repeats validation for redirects. IPv4-mapped, NAT64, transition,
   local, multicast and documentation IPv6 addresses are rejected conservatively.
   Injected fetch implementations are test seams, not a production safety bypass.
3. Content-addressed storage trusted the caller's digest and ignored mismatched
   existing content. It now verifies incoming and existing bytes, publishes a
   completed temporary file atomically with a hard link, and preserves corrupt
   existing content as an explicit failure rather than silently replacing it.
4. Login attempts now have a constant-memory per-process burst cap, with window
   recovery. Existing public API nosniff/no-referrer/deny-framing headers remain.

## Evidence and operational limits

`admin-session.test.mjs`, `admin-login-limit.test.mjs`,
`source-fetch-security.test.mjs` and `document-storage-integrity.test.mjs` cover
valid operation, role/identity tampering, expiry/revocation, invalid configuration,
unsafe/mixed DNS results, redirect revalidation, pinned TLS/Host options, bounded
response reads, aborts, mismatched/corrupt evidence and concurrent duplicate writes.
These tests use isolated fixtures and mocked HTTP transport; no real endpoints
or production secrets are used. Actual CI must still verify the full web build,
database suite and container for the committed head.

Production ingress must enforce distributed request/connection limits, TLS and
organization access controls. The in-process sign-in limiter resets with replicas
or restarts and is a backstop, not a distributed abuse-control service. The existing
PDF parser checks file signature and uses bounded retrieval. Extraction now rejects
inputs above25MiB, documents above500pages, or extracted text above5million
characters, with cleanup preserved on failure. Parser-version monitoring and
process-level CPU/memory isolation remain operational controls.
Filesystem storage requires an administrator-controlled directory with atomic
hard-link support. Host-level write access or hostile symlinks are outside this
application credential boundary. No infrastructure configuration was changed.

Recovery: provision the new signing secret/principal configuration privately,
restart/redeploy, and sign in again. Removed/rotated principals must fail on their
next request. A corrupt stored file must be investigated and recovered from the
verified evidence backup; do not overwrite it automatically. Deployment and live
identity-proxy verification remain distinct from source implementation.
