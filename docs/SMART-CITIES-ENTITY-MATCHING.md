# PR 18 — Official-source entity and relationship matching

This downstream matching service resolves **explicit references** in official source rows to existing registry records. It never publishes or creates a relationship directly.

## Matching and provenance

A caller supplies the existing source record, relationship type, target record type, exact target external-identifier scheme/value, source HTTPS URL, source key and source field. Only exact identifiers within the **same registry and expected record type** qualify. Queries cap matches at two so zero matches and ambiguity are reported separately.

A unique match produces a pending candidate through the generic `PostgresRelationshipCandidateService`, which validates the relationship type and endpoint record types, stores evidence and a hash, emits audit events and requires a separate authorized review for approval. Repeating a matching reference uses a deterministic candidate ID and the generic idempotent proposal operation.

No fuzzy name matching, inferred coordinates, guessed vendor identities, or public display of unreviewed candidates. Source rows without adequate provenance are rejected. The upstream engine remains domain-neutral.

## Follow-up

Connect this service to configured provider mapping profiles in a separate integration milestone. Any inferred/fuzzy matches should remain strictly opt-in and never bypass human approval.
