# PR 20 — Provider relationship projection

`projectProviderRelationships` connects a normalized PR 16 official-source adapter row to PR 19's explicit relationship ingestion bridge **after** the generic ingestion service has persisted a draft record and returned its ID.

The profile is tied to one adapter ID. No relationship is proposed if the adapter identity differs or if the profile has no approved mappings. Only explicitly mapped columns are forwarded as possible external identifiers. Public row canonical URLs and stable source keys are preserved as provenance.

The output is a structured report of proposals, existing relationships, unmatched identifiers, ambiguities and invalid references. The downstream PR 18 matcher persists proposals for human review, not auto-publication.

This is an opt-in provider projection interface; it is not yet a configured background job, and does not execute live government feeds.
