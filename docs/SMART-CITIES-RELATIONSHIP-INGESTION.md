# PR 19 — Explicit official-source relationship integration

A source adapter can provide structured rows for normal draft-first ingestion. **Only after successful record creation or update**, the ingestor may invoke `proposeRelationshipsForIngestedRow` with the persisted record ID, official source URL, stable external row ID, and a reviewed set of explicit field mappings.

Each field mapping identifies a named source column containing an official external identifier, the exact relationship type, the target record type, and external identifier scheme. Values may be strings or arrays of strings. Object values and unsupported types are skipped with warnings. Repeated IDs are deduplicated. Names or free text are never treated as IDs without an explicit mapping.

The integration preserves source-key/field/URL provenance and returns proposed, existing, unmatched, ambiguous, and invalid results individually. It invokes the PR 18 matcher, which only creates pending audit-tracked relationship candidates. No publication occurs.

Provider-specific configuration and live scheduled source runs must explicitly supply these mappings. This milestone adds the integration service and regression tests; it does not claim to have executed production ingestion or created live public records.
