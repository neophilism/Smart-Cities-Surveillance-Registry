# External compliance evidence API

SC-20 imports optional authorization, accountability and audit *assertions* from
an explicitly configured provider API. The response contract is JSON
`{"schemaVersion":1,"claims":[...]}`. Every claim carries registryId,
recordId, providerId, sourceId, HTTPS sourceUrl, observedAt, kind and assertion.
A claim never grants access, approves publication, establishes compliance or
implies Federal Encryption Compliance certification.

The operator configures `SMART_CITIES_COMPLIANCE_ENDPOINT` (HTTPS),
`SMART_CITIES_COMPLIANCE_TOKEN`, and the exact registry, record and provider
IDs with `SMART_CITIES_COMPLIANCE_REGISTRY_ID`,
`SMART_CITIES_COMPLIANCE_RECORD_ID`, and
`SMART_CITIES_COMPLIANCE_PROVIDER_ID`. Run
`node packages/smart-cities-compliance/src/cli.ts` only after migration 0016 and after the
scoped record exists. The endpoint is operator configured, not supplied by a
web request. No endpoint or credential is returned in the import audit.
Provision the token through a secret store, never in source or CLI arguments.

The client rejects HTTP errors, redirects, wrong media type, unsupported schema,
oversized batches/responses and cross-scope claims. Imports are transactional
and idempotent by provider, source, kind and observation time. Successful and
failed attempts have private audit rows; failures use coarse codes without
response bodies or credential values. Retry after a provider failure with the
same scope; duplicate facts do not create duplicate rows. The private read
method requires registry and record IDs and caps results at 500. Any future
public projection must apply the existing disclosure and public-safety policy
before showing individual assertions.
