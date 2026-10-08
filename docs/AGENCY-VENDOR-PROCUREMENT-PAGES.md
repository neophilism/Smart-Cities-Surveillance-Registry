# Agency, vendor, and procurement pages

PR 11 adds purpose-built accountability summaries for public agencies, vendors,
and procurement records.

## Agency pages

Agency profiles foreground:

- jurisdiction and agency type;
- public-records access;
- deployments operated;
- procurements conducted;
- policies administered;
- authorizations issued;
- audits and assessments; and
- data-sharing arrangements.

## Vendor pages

Vendor profiles foreground:

- legal identity and vendor type;
- headquarters;
- technologies supplied;
- contracts and procurements;
- deployments reachable through the public accountability graph; and
- connected public agencies.

Two-hop graph traversal is used for the last two items because a vendor often
connects to a deployment through technology or procurement rather than through a
direct relationship.

## Procurement pages

Procurement pages foreground:

- procurement type and status;
- reference number;
- public amount and currency;
- award/start/end/renewal dates;
- procuring agency;
- vendor;
- technology acquired;
- related deployments;
- public evidence; and
- renewal/expiration deadlines.

## Validation

Integration tests verify the Harborview demonstration data exposes the expected
agency, vendor, and procurement relationship paths, evidence, and deadline
records.

All specialized summaries continue to use the existing public projection,
disclosure, lifecycle, and public-safety boundaries.
