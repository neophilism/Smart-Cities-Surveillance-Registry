# Public homepage and registry navigation

PR 9 turns the application root into the public front door for the Smart Cities
Surveillance Registry.

The homepage is not a static marketing page. Its counts, recent records, browse
navigation, and accountability dates are derived from current public registry
data.

## Hero and search

The homepage opens with a plain-language accountability framing:

```text
See the systems. Follow the authority. Check the evidence.
```

A registry-wide search box sends users directly into the existing public search
experience.

## Live registry metrics

The homepage displays current public counts for:

- deployments;
- technologies;
- public agencies;
- vendors;
- audits and assessments; and
- incidents and findings.

Counts come from public search facets rather than hard-coded application
constants.

Whole-record placeholders remain part of the public registry count because the
application deliberately preserves the public existence of withheld records.

## Accountability pulse

The homepage surfaces the next six future public accountability dates.

Examples include:

- remediation deadlines;
- deployment audit dates;
- policy review dates;
- authorization expiration;
- procurement renewal or expiration; and
- data-sharing expiration.

The query includes only:

- open deadlines;
- public records;
- publicly visible lifecycle states;
- deadline types explicitly configured as public; and
- records that are not wholly withheld.

The cards link back to the affected record.

## Recent additions

The homepage displays the six most recently published public records.

It uses the public search projection, so field disclosure rules apply before
content is rendered.

Records whose public placeholder does not expose a title are not rendered in the
recent-content list.

## Browse navigation

All ten configured record types appear as browse cards with:

- the record-type name;
- current public count;
- description; and
- direct link into the filtered records view.

The navigation is schema-driven, so later record-type additions do not require a
separate hard-coded homepage section.

## Public-safety integration

PR 9 continues to use the PR 7 safety boundary.

Recent public search hits are scanned before homepage rendering. The database
publication boundary remains the primary enforcement layer.

Upcoming deadlines read titles from the stored public field projection rather
than canonical private fields.

## Responsive design

The homepage adds responsive layouts for:

- hero/search;
- six metric cards;
- accountability deadline cards;
- recent additions;
- record-type browse cards; and
- registry principles.

The existing application palette and typography are retained so the new public
front page fits the rest of the interface.

## Validation

PR 9 integration tests seed the PR 8 Harborview dataset and verify that the
homepage data model:

- reports live public counts;
- exposes recent public records;
- orders upcoming accountability dates;
- includes deployment audit and procurement renewal deadlines; and
- omits a wholly withheld record from recent-content and deadline detail
  surfaces while preserving its public placeholder count.
