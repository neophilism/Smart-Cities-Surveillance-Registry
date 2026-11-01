# SC-20 source and security review

Reviewed scope: the versioned machine import route, provider client, claim
validator, PostgreSQL store/migration, private administrator view and tests.
This is an AI-assisted source review and test record, not an independent audit
or a production certification.

| Threat or failure | Control and evidence |
| --- | --- |
| Unauthenticated or browser-origin import | Push route requires a separate 32+ character server-configured bearer token. Administrator cookies and self-declared roles are not accepted by the machine handler. Negative auth test: `tests/external-compliance-push.test.mjs`. |
| Cross-registry, record or provider fact | Server fixes registry/provider scope; every claim must match the scoped record. Storage revalidates before a transaction, and PostgreSQL uses a scoped record FK. Negative tests: provider, push, store and integration tests. |
| Provider response redirects, oversized payload or malformed data | Outbound client uses HTTPS, no redirects, timeout, a one-megabyte streaming limit, schema version and media-type checks; inbound push also caps and validates the body. Provider and push tests cover rejection. |
| Duplicate or conflicting delivery | Claim key is unique by registry, record, provider, source, kind and observation time. Identical retries are idempotent; conflicting duplicates fail before storage. Store and PostgreSQL integration tests cover retry. |
| False compliance or automatic publication | Imported rows are private source assertions. Neither API returns a compliance verdict nor calls the publication lifecycle. The admin view states the limit. The public API does not project these rows. |
| Credential or provider error leakage | Token stays in server environment. Failure audit stores a coarse error code, and API failures return generic messages. Store tests inspect failure audit fields. |
| Partial persistence after database failure | The store locks the scoped record and writes claim/audit rows in one transaction. Rollback and recovery are tested. |

The provider endpoint is configured by an operator rather than by a request
parameter. HTTPS and redirect rejection prevent common token forwarding.
Connection trust still depends on correct operator configuration and TLS/DNS;
no live provider endpoint or secret was available for an end-to-end production
check. The administrator view follows the repository's existing shared-token
admin session model; per-user server-bound roles are a broader security
hardening follow-up. Assistive technology runtime QA and exact-head CI remain
separate acceptance evidence and must not be inferred from this review.
