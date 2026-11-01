# Registry analytics

PR 16 adds reusable, domain-neutral analytics to the Civic Registry & Transparency Engine.

## Metrics

The analytics repository computes:

- total record counts;
- records that have ever been published;
- record-type distribution;
- lifecycle/status distribution;
- monthly publication trends;
- monthly immutable record-change activity;
- evidence/citation coverage;
- open, due-soon, and overdue deadlines; and
- configurable field breakdowns.

Field breakdowns are generated from registry fields already marked `filterable: true`. This keeps the analytics model configuration-driven without adding policy-specific dimensions to the engine.

## Public safety boundary

Public analytics are not aggregates over canonical data.

They apply the same conservative boundary used by the public registry:

- only `visibility: public` records are eligible;
- configured public lifecycle statuses are enforced;
- hidden withheld records are excluded;
- field dimensions read `public_fields`, never canonical `fields`;
- public activity counts only public immutable audit events;
- evidence coverage counts only public citations; and
- deadline aggregates are limited to definitions configured as publicly visible.

A redacted or withheld field therefore cannot be recovered by selecting it as an analytics dimension.

## Administrator analytics

The administrator console exposes a separate internal analytics route. It aggregates canonical records and all operational deadlines/audit activity available to the restricted operator console.

The public and internal scopes share one repository contract but have different data boundaries.

## Transparency coverage and timeliness

The public dashboard displays cited and uncited record counts alongside coverage.
The denominator is the number of currently eligible public records, not citations
or fields. Multiple citations on one record count once. A citation to a redacted,
withheld, absent, or null public field does not count; record-level citations do.
Private citations never count. No eligible records displays “Not available” in the
dashboard rather than implying a measured zero-percent coverage.

Coverage describes disclosed provenance, not evidence quality, completeness,
accuracy, or the existence of private evidence. Cross-registry comparisons depend
on each registry's publication and disclosure rules. Public deadlines show open,
due within 30 days, and overdue counts; these reflect stored due dates and do not
assert legal compliance. Monthly publications and public change activity retain
their existing scoped, immutable audit source.

`tests/analytics.integration.mjs` exercises duplicate citations, private citations,
redacted-field evidence, record-level evidence, empty lifecycle eligibility and
registry isolation against PostgreSQL. `tests/analytics-coverage.test.mjs` exercises
numeric totals, rounding, empty results and failure propagation with a pool double.
Runtime browser/screen-reader testing is not claimed by these tests.

## Routes

- Public: `/registries/:registryId/analytics`
- Administrator: `/admin/registries/:registryId/analytics`

Both surfaces support configured field breakdowns through a query-string dimension selector.
