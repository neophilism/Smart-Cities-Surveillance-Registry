# Smart Cities public-safety boundary

PR 7 establishes an application-specific public-safety boundary for the Smart
Cities Surveillance Registry.

The registry is intended to expose public accountability information without
publishing operational details that could create security, privacy, or targeting
risk.

## Publicly prohibited data

The automated boundary rejects or withholds obvious instances of:

- precise device or operational coordinates;
- private or link-local network addresses;
- MAC addresses and similar hardware identifiers;
- passwords, API keys, access tokens, client secrets, and private keys;
- individual target or subject identifiers;
- raw license-plate values;
- biometric template identifiers;
- device IDs and serial numbers used as public identifiers;
- SSIDs/BSSIDs and similar topology metadata; and
- structured fields explicitly reserved for operational or raw surveillance
  data.

The application still permits high-level accountability categories such as:

- `license_plate_data` as a data category;
- `biometric_identification` as a capability category;
- a broad public location such as "Downtown district"; and
- public descriptions of retention, sharing, legal-process, or oversight rules.

The boundary is designed to distinguish the existence or category of a
surveillance capability from raw operational or person-level data.

## Defense in depth

PR 7 uses three layers.

### 1. Operator preflight

Before an administrator moves a record into a publicly visible lifecycle state,
the application scans the record and reports unsafe fields.

Fields already configured as redacted or withheld are excluded from that
preflight because their canonical values are not part of the public projection.

A whole-record withholding rule likewise permits the canonical record to remain
stored while the public sees only a safe placeholder.

### 2. Database publication guard

Migration `0014_smart_cities_public_safety.sql` adds a database trigger scoped
only to:

```text
smart-cities-surveillance-registry
```

It runs whenever a record is inserted or updated into one of the public
lifecycle states:

- `published`;
- `withdrawn`;
- `superseded`; or
- `archived`.

The trigger checks public record fields, external identifiers, and tags.

This means scheduled publication, ingestion, direct repository calls, and other
write paths cannot bypass the public-safety boundary simply by avoiding the
administrator UI.

### 3. Fail-safe public projection

Public record projection runs an additional application-level scanner.

If unsafe legacy content somehow exists despite the database guard, the public
surface replaces the record contents with a safe placeholder:

```text
Record withheld for public-safety review
```

External identifiers and tags are removed from that fallback projection.

Dynamic evidence and history metadata are also scanned. Unsafe citation/source
metadata or history events are suppressed rather than rendered publicly.

## Disclosure-aware behavior

The public-safety boundary works with the disclosure model from PR 4.

A sensitive canonical field may be retained internally when the field is
already marked:

- `redacted`; or
- `withheld`.

The database guard skips that protected field when deciding whether the record
may enter a public lifecycle state.

The guard also prevents removal of that field-level protection while the record
is public if doing so would expose unsafe content.

The same rule applies to whole-record withholding: a withheld record containing
unsafe public data cannot simply have its withholding removed until the unsafe
content is corrected or protected at the field level.

## Location policy

The deployment schema uses:

```text
public_location_scope
```

for broad public geography.

Examples of appropriate values include:

- "Downtown district";
- "Selected public rights-of-way";
- "Transit stations in the central service area"; and
- "Citywide pilot area".

High-precision latitude/longitude pairs are rejected from this field.

PR 14 may later use appropriate public map granularity, but the underlying
registry should not contain live device coordinates in public projections.

## Internal records

The boundary applies to public lifecycle records.

Restricted/private working records may retain sensitive canonical detail for
authorized review. Before such data becomes public, it must be generalized,
redacted, or withheld.

This preserves legitimate internal review workflows without allowing those
details to leak through public search, APIs, exports, graphs, or record pages.

## Automated checks

PR 7 regression tests cover:

- high-level public records that should pass;
- precise coordinates;
- private IPv4/IPv6 topology;
- MAC addresses;
- credentials and embedded URL credentials;
- private-key material;
- target/subject identifiers;
- raw license-plate and biometric identifiers;
- sensitive external-identifier schemes;
- fail-safe public placeholders;
- database rejection of unsafe publication;
- successful publication when the unsafe field is already redacted;
- successful whole-record withholding;
- blocked removal of disclosure protection; and
- rejection of unsafe edits to already published records.

## Scope

This is a deterministic safety boundary, not a substitute for human disclosure
review.

It intentionally targets concrete, high-confidence leak patterns. More nuanced
questions about whether a public fact could create operational risk still
require editorial and legal review.
