# Advanced Smart Cities search

PR 13 adds graph-aware accountability filtering to the public registry search.

The existing full-text and record-type filters remain available. Smart Cities
adds a second layer of filters for:

- jurisdiction;
- agency;
- vendor;
- technology type;
- deployment status;
- data category;
- retention range;
- legal-process requirement;
- policy status;
- audit status; and
- incident status.

## Graph-aware filtering

Agency, vendor, technology, and other Smart Cities filters resolve a set of
public candidate records before the generic search engine runs.

The resolver starts from public records matching the selected filter and follows
the public accountability graph to a bounded depth of two. Multiple advanced
filters are intersected.

This allows a query such as a vendor filter to return the vendor together with
connected technologies, procurements, deployments, and agencies without
hard-coding vendor logic into the generic search engine.

## Generic search extension

The reusable search request now supports an optional `recordIds` candidate
list.

The database search provider applies that list before:

- full-text matching;
- record-type filtering;
- status/tag filtering;
- configured field filters;
- pagination;
- sorting; and
- facet calculation.

This preserves correct result totals and pagination instead of filtering a page
of results after the query.

The generic filter accepts at most 5,000 unique candidate IDs.

## Public-safety and disclosure

Advanced filter anchors are derived only from:

- public records;
- publicly visible lifecycle states;
- `public_fields`; and
- records that are not wholly withheld.

The public search projection still applies field disclosure and the PR 7
public-safety fallback before rendering results.

## Retention and legal-process filtering

Retention filters operate on public deployment `retention_days` values.

Legal-process filtering operates on the public
`legal_process_requirement` field.

The resulting deployment context is expanded through the accountability graph
so users can follow relevant public agencies, policies, vendors, and
procurements.

## Validation

Integration tests verify:

- vendor filtering reaches technology, procurement, deployment, and agency
  context;
- jurisdiction, deployment status, retention, and legal-process filters
  intersect correctly;
- technology type and data-category filters isolate the plate-reader demo
  context;
- policy, audit, and incident status filters resolve the expected public
  accountability networks;
- empty filters produce an empty candidate list rather than unfiltered results;
  and
- generic search pagination still applies after candidate filtering.
