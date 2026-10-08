# Smart Cities demonstration dataset

PR 8 adds a completely synthetic demonstration jurisdiction named
**Harborview**.

Nothing in the dataset is intended to describe a real city, agency, vendor,
deployment, contract, policy, incident, or data-sharing arrangement.

All web domains use the reserved `.example` namespace.

## Seed command

After migrations:

```bash
pnpm db:seed-demo
```

This loads:

- 4 synthetic public sources;
- 6 synthetic archived-style documents;
- 15 registry records;
- 17 field/record citations; and
- 24 typed relationships.

The seed is safe to run repeatedly. Existing entities are updated and unchanged
relationships are not duplicated.

## Scenario

The fictional Harborview scenario includes two surveillance deployments:

### Downtown Camera Safety Program

A synthetic active fixed-camera program used to demonstrate:

- public purpose and location scope;
- collection and data categories;
- retention rules;
- legal-process requirements;
- governing policy;
- council authorization;
- procurement;
- technology and vendor relationships;
- privacy assessment;
- a retention-configuration finding;
- remediation deadline;
- interagency data-sharing; and
- a future audit date.

Its critical PR 6 evidence fields have complete public field-level citations.

### Transit Access Plate-Reader Pilot

A second synthetic deployment demonstrates how the registry can describe
plate-reading technology at a public accountability level without containing raw
plate observations or exact device locations.

It is intentionally modeled as a limited pilot with:

- a broad public location scope;
- a fourteen-day standard retention rule;
- a warrant-required legal-process setting;
- a published oversight date; and
- explicit technology/vendor relationships.

## Domain coverage

The dataset contains every canonical PR 2 record type:

- deployment;
- technology;
- agency;
- vendor;
- policy;
- authorization;
- procurement;
- audit;
- violation; and
- data-sharing arrangement.

## Relationship coverage

The seed exercises every PR 3 relationship type at least once, including:

```text
deployment -> technology -> vendor
deployment -> agency
deployment -> authorization -> agency
deployment -> policy -> agency
deployment -> procurement -> agency/vendor/technology
audit -> deployment / agency
violation -> deployment / audit
data-sharing -> deployment / source agency / recipient agency / policy
```

This gives graph pages meaningful multi-hop data from the first demonstration
install.

## Lifecycle and public presentation

All demonstration records are seeded as published public records through the
engine's explicit lifecycle-bootstrap path.

This is intentional only for deterministic fixture/demo installation. Ordinary
records still use the controlled PR 4 review and approval workflow.

The records are compatible with:

- public record pages;
- search;
- graph traversal;
- API/export projection;
- deadlines;
- evidence;
- history; and
- later analytics.

## Deadlines

The dataset populates anchors for every PR 5 public accountability deadline:

- deployment audit;
- policy review;
- authorization expiration;
- procurement renewal;
- procurement expiration;
- audit follow-up;
- violation remediation; and
- data-sharing expiration.

No due date is invented by the seed. Every materialized clock comes from an
explicit synthetic source field.

## Evidence

The seed includes synthetic official-style sources and PDF metadata for:

- surveillance governance policy;
- council authorization;
- procurement contract;
- privacy assessment;
- remediation report; and
- data-sharing agreement.

Documents include:

- canonical synthetic URLs;
- retrieval provenance through their source;
- 64-character SHA-256 values;
- page counts; and
- field-level page/section locators.

The Downtown Camera Safety Program reaches complete PR 6 public evidence
coverage for all populated critical deployment fields.

## Public-safety constraints

The PR 7 public-safety scanner is run against every demonstration record and
public evidence object in automated tests.

The dataset deliberately contains **no**:

- exact device coordinates;
- private network addresses;
- hardware identifiers;
- credentials or private keys;
- target/subject identifiers;
- raw license-plate values;
- biometric templates; or
- live operational topology.

It may describe categories such as `license_plate_data` because public
accountability requires describing what kind of data a system handles. That is
different from publishing an observed plate value.

## Validation

PR 8 tests verify:

- every canonical record type is represented;
- every relationship type is exercised;
- every record validates against the current schema;
- every record and public evidence object passes the PR 7 safety boundary;
- every source/document URL uses a reserved synthetic domain;
- the principal deployment reaches complete evidence coverage;
- every accountability deadline type is exercised;
- the database seed creates the expected entities;
- public search finds the principal deployment;
- two-hop graph traversal reaches vendor, policy, authorization, procurement,
  audit, incident, data-sharing, and recipient-agency nodes; and
- reseeding does not duplicate relationships.
