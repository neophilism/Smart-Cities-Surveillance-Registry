# Smart Cities publication and disclosure

PR 4 configures the Smart Cities Surveillance Registry to use the Civic Registry
engine's controlled publication, immutable history, and disclosure mechanisms.

The application-specific policy lives in `config/registry.yaml`. The lifecycle,
history, disclosure, search projection, and audit implementations remain generic
engine infrastructure.

## Publication lifecycle

Every ordinary record begins in:

```text
draft
```

The standard publication path is:

```text
draft
  -> under_review
  -> approved
  -> published
```

Roles are separated:

- editors submit records for review;
- reviewers request approval;
- a reviewer or publisher other than the requester must approve the approval
  request; and
- publishers perform final publication.

This prevents an ordinary editor from creating a record directly in the public
state or bypassing the configured workflow.

## Public and non-public lifecycle states

The following working states are not public:

- `draft`;
- `under_review`; and
- `approved`.

The following states remain public:

- `published`;
- `withdrawn`;
- `superseded`; and
- `archived`.

A withdrawn record therefore remains part of the public accountability history
rather than vanishing.

A superseded record likewise remains public so a newer record can replace it
without erasing the historical version from the registry.

`archived` is terminal.

## Scheduled publication

Approved records may be scheduled for publication by a publisher.

Scheduled publication is permitted only:

```text
approved -> published
```

so scheduling cannot bypass review and approval.

## Corrections

Published record fields may be corrected without rewriting history.

Every stored update creates an immutable record version and audit event. When a
correction is made through the repository with actor/reason context, the history
records:

- the corrected snapshot;
- the responsible actor; and
- the reason for the correction.

Earlier snapshots remain immutable.

This allows factual corrections without pretending the earlier public record
never existed.

## Supersession

A publisher may transition a published or withdrawn record to
`superseded`.

Supersession is distinct from deletion:

- the record remains publicly visible;
- its immutable revision history remains available;
- the record can later be archived; and
- a replacement record can proceed through its own review and publication
  lifecycle.

A later milestone may add more specialized replacement-link presentation if
needed; PR 4 establishes the lifecycle semantics.

## Field disclosure

The engine supports field-level:

- disclosure;
- redaction; and
- withholding.

Smart Cities defaults are:

```text
redacted field -> [REDACTED]
withheld field -> [WITHHELD]
```

When configured disclosure metadata exists, the public projection may also show
the public reason, authority, and note.

The internal stored value is retained for authorized workflows, but redacted or
withheld values are removed from the public search projection.

This is important for fields such as operationally sensitive descriptions or
values awaiting public verification.

## Whole-record withholding

The application uses placeholder mode rather than silently removing a withheld
record.

A withheld public record is represented as:

```text
Surveillance registry record withheld
Public contents of this registry record are withheld.
```

Tags and external identifiers are stripped from the placeholder.

When available, a public reason, authority, and note may explain the
withholding.

This preserves public accountability for the existence of a record while
protecting content that cannot safely or lawfully be disclosed.

## Documents

PR 4 also configures the default title for a withheld document:

```text
Surveillance registry document withheld
```

Document-level evidence and source workflows are developed further in PR 6.

## Validation

Application-specific tests verify:

- records cannot be created directly as published;
- review and independent approval are enforced;
- only publishers may perform final publication;
- publication sets the publication timestamp;
- corrections create immutable actor/reason history;
- redacted and withheld fields use the configured replacement text;
- redacted content disappears from public search while remaining internally
  searchable;
- superseded records remain lifecycle-public; and
- whole-record withholding produces the configured public placeholder.
