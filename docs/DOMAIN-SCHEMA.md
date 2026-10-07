# Smart Cities domain schema

PR 2 establishes the canonical application vocabulary for the Smart Cities
Surveillance Registry.

The schema is defined in:

```text
config/registry.yaml
```

It is ordinary Civic Registry configuration. No forked database model or
Smart-Cities-specific engine package is required.

## Record types

The application begins with ten canonical record types.

### Surveillance deployment

A public, non-operational description of an approved, proposed, pilot, active,
suspended, retired, or cancelled surveillance deployment.

Important fields include:

- jurisdiction and jurisdiction type;
- public deployment status;
- approved purpose and public summary;
- public location scope;
- capability and data categories;
- collection mode;
- retention period and basis;
- sharing categories;
- legal-process requirements; and
- approval, operation, and retirement dates.

The schema deliberately uses `public_location_scope` rather than exact device
coordinates. Operationally sensitive location and target data do not belong in
the public registry schema.

### Surveillance technology

A technology, product, or capability used for public monitoring. The schema
captures technology category, manufacturer/model/version, capability categories,
data categories, and whether the technology supports real-time, biometric, or
automated decision-support behavior.

### Public agency

A government agency, office, authority, department, public educational
institution, or other public body responsible for surveillance activity.

### Vendor

A manufacturer, software provider, systems integrator, data provider,
consultant, service provider, nonprofit, or other supplier.

### Policy or law

A statute, ordinance, regulation, agency policy, privacy policy, retention
policy, data-sharing rule, acceptable-use policy, legal-process rule, or
oversight standard.

### Approval or authorization

A legislative, executive, agency, emergency, pilot, waiver, permit, or other
formal authorization decision.

### Procurement or contract

A contract, purchase order, solicitation, grant, lease, cooperative agreement,
intergovernmental agreement, or other procurement instrument.

### Audit or assessment

A compliance audit, privacy impact assessment, civil-rights assessment, security
assessment, algorithmic impact assessment, retention/access audit, incident
review, post-implementation review, or other formal evaluation.

### Violation or incident

A publicly reportable misuse allegation, unauthorized access/use, excessive
retention, improper sharing, security breach, policy violation, civil-liberties
complaint, accuracy/bias issue, procurement problem, or similar event.

The schema distinguishes the incident category from the investigation/remedy
status so an allegation is not represented as a substantiated finding.

### Data-sharing arrangement

A public arrangement governing routine, case-specific, emergency, mutual-aid,
fusion-center, vendor-processing, federal, research, public-release, or other
access to surveillance-derived information.

## What PR 2 does not define

PR 2 is intentionally limited to the domain vocabulary and typed fields.

The following are separate milestones:

- PR 3: relationship and accountability graph;
- PR 4: publication lifecycle and disclosure;
- PR 5: statutory/accountability deadlines;
- PR 6: primary-source evidence;
- PR 7: stronger public-safe / operational-security enforcement;
- PR 8: demonstration data.

Keeping these concerns separate makes the application easier to review and
prevents policy assumptions from being hidden inside one very large schema
change.

## Validation

The checked-in schema is compiled by the generic Civic Registry configuration
engine.

Regression tests verify:

- all ten canonical record types exist;
- each record type has a required searchable title field;
- deployment fields use a public location scope rather than operational
  coordinates;
- important enum states exist;
- a representative deployment validates;
- missing required fields and invalid enum values are rejected; and
- every record type has deterministic default list presentation.
