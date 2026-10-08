# Smart Cities primary-source evidence

PR 6 applies the Civic Registry engine's generic evidence system to the Smart
Cities Surveillance Registry.

The goal is not merely to attach documents to records. The goal is to make
important public claims traceable to identifiable primary sources at the field
level.

## Evidence chain

The application uses the engine's existing three-part evidence chain:

```text
Source
  -> Document
  -> Citation
  -> Registry record or specific record field
```

A citation may point directly to a source, to a document, or to both.

When a document is linked to a source, document-only citations inherit that
source in resolved evidence bundles.

## Primary-source classes

Typical Smart Cities primary sources include:

- statutes, ordinances, regulations, and agency policies;
- city-council or agency approvals and authorizations;
- contracts, purchase orders, solicitations, grants, leases, and other
  procurement records;
- privacy impact assessments;
- civil-rights, algorithmic, security, retention, and compliance assessments;
- formal audits and post-implementation reviews;
- official incident findings and remediation notices;
- memoranda of understanding and data-sharing agreements;
- official public datasets and APIs; and
- official publication pages that identify or host those records.

PR 6 does not infer that a URL is official merely because it is public. Source
authenticity and provider-specific allowlists belong in the later source-adapter
work.

## Provenance metadata

A strong public evidence bundle should preserve:

- the source title;
- canonical public source URL;
- source publication time when known;
- retrieval timestamp;
- document title;
- canonical document URL when available;
- MIME type;
- content SHA-256 for archived documents;
- page count and language when known;
- citation page/section/paragraph/line/fragment locator; and
- the time the citation was added.

Internal content-addressed storage keys may also be retained by the engine, but
they are not exposed by the public evidence presentation.

## Archive integrity

When a document is archived, the document SHA-256 binds the citation to exact
retrieved bytes.

A later retrieval of changed bytes can therefore be stored as a distinct
document version rather than silently replacing the evidence used for an
earlier claim.

PR 6 treats the following as strong document provenance:

- a canonical source or document URL;
- a source retrieval timestamp;
- a document SHA-256; and
- a document locator on the citation.

For webpage-only evidence, a document hash and page locator are not required.

## Field-level evidence policy

PR 6 adds a Smart Cities-specific evidence coverage policy in:

```text
apps/web/lib/smart-cities-evidence.ts
```

The policy identifies critical fields for all ten record types.

Examples include:

### Deployment

- deployment status;
- approved purpose;
- retention period;
- legal-process requirement;
- approval date; and
- next audit date.

### Policy

- policy type;
- citation or identifier;
- status;
- adoption/effective/expiration dates; and
- review date.

### Authorization

- authorization type;
- approving body;
- reference number;
- status; and
- approval/effective/expiration dates.

### Procurement

- procurement type and status;
- reference number;
- amount;
- award/start/end dates; and
- renewal date.

### Audit

- assessment type;
- assessor;
- completion date;
- overall status;
- public findings summary; and
- next review date.

### Violation or incident

- incident type;
- investigation/remediation status;
- severity;
- occurrence/report dates;
- remediation due date; and
- resolution date.

### Data-sharing arrangement

- sharing type;
- recipient and data categories;
- legal basis;
- access conditions;
- retention rules;
- status; and
- effective/expiration dates.

Technology, agency, and vendor records also define material identity and
capability fields that should be sourced when populated.

## Coverage semantics

Coverage is evaluated only for critical fields that are actually populated.

The evaluator reports:

- whether the record has at least one whole-record public citation;
- which populated critical fields have public field-level citations;
- which populated critical fields are missing public evidence;
- total public citation count; and
- whether the record is complete under the Smart Cities evidence policy.

A missing value does not manufacture an evidence gap.

A populated claim without a public field-level citation does.

## Why whole-record evidence is not enough

A contract PDF may prove that a procurement exists without proving every field
copied into the registry.

For example, attaching one contract to a procurement does not automatically
establish:

- contract status;
- renewal date;
- amount;
- end date; or
- later amendments.

PR 6 therefore treats a whole-record citation and field-level coverage as
separate concepts.

## Visibility boundary

Only public citations count toward public evidence coverage.

Private, restricted, or embargoed evidence may support internal review but
cannot satisfy the public evidence policy.

The underlying engine also prevents a public citation from exposing a private
source or document.

## Public corrections and evidence

When a public claim changes, the record history preserves the earlier value and
the correction.

Evidence can then be updated with a new source/document/citation chain while the
earlier historical evidence remains auditable.

## Validation

PR 6 tests verify:

- all ten record types have an evidence policy;
- only populated critical fields are required;
- private citations do not satisfy public coverage;
- strong document provenance includes canonical URL, retrieval time, hash, and
  locator;
- a real deployment can reach complete evidence coverage through field-level
  citations;
- document-only citations resolve the document's source; and
- a procurement with one attached contract but only one field citation remains
  correctly flagged as evidence-incomplete.
