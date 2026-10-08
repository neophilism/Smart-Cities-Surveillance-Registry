# Deployment and technology pages

PR 10 gives the two core surveillance record types purpose-built public
accountability summaries while retaining the generic record details, evidence,
history, deadlines, and relationship sections underneath.

## Deployment overview

Deployment pages now foreground:

- approved purpose;
- public location scope;
- data categories;
- collection mode;
- retention period and basis;
- legal-process requirement;
- sharing categories;
- operating agency;
- deployed technology;
- vendors reachable through the public accountability graph;
- authorizations;
- governing policies;
- procurement;
- audits and incidents;
- data-sharing arrangements;
- evidence count; and
- public deadline count.

The vendor summary uses a bounded two-hop public relationship graph because a
vendor is commonly connected through the deployed technology or procurement
rather than directly to the deployment.

## Technology overview

Technology pages now foreground:

- category;
- manufacturer;
- model and version;
- capability categories;
- data categories;
- real-time capability;
- biometric capability;
- automated decision-support capability;
- supplier/vendor relationships;
- deployments using the technology;
- procurements acquiring the technology; and
- public evidence count.

## Public-safety behavior

All inputs to these summaries come from the existing public record,
relationship, graph, evidence, and deadline projections.

The specialized pages therefore inherit:

- PR 4 disclosure/redaction rules;
- PR 7 public-safety fallback;
- public lifecycle filtering; and
- visibility-aware graph traversal.

No specialized component reads private canonical fields directly.

## Generic details remain available

The purpose-built overview does not replace the generic record page.

Below the new summary, users can still access:

- the complete configured field list;
- registry metadata;
- deadlines;
- change history;
- evidence groups;
- relationship groups;
- relationship browser; and
- relationship map.

This keeps the record complete while making the most important accountability
questions answerable immediately.

## Validation

PR 10 integration tests seed the Harborview dataset and verify that:

- the deployment's direct graph includes technology, operator, authorization,
  policy, procurement, audit, incident, and data-sharing relationships;
- the two-hop graph reaches the vendor;
- the deployment has public evidence and its audit deadline;
- the technology connects to its supplier;
- deployments using the technology are discoverable; and
- procurement relationships are present.
