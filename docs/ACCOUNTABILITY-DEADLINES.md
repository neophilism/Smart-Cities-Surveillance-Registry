# Smart Cities accountability deadlines

PR 5 configures public accountability clocks for the Smart Cities Surveillance
Registry using the Civic Registry engine's generic deadline system.

These clocks are tied to dates stated in the public record. They are not
editorial workflow timers.

## Configured deadlines

PR 5 defines eight public deadline types.

### Deployment audit due

Record type:

```text
deployment
```

Anchor:

```text
next_audit_due_on
```

Warning window: 30 calendar days.

This field is added to the deployment schema in PR 5 because it is specifically
an accountability-clock field rather than a basic identity field.

### Policy review due

Record type:

```text
policy
```

Anchor:

```text
review_due_on
```

Warning window: 30 calendar days.

### Authorization expires

Record type:

```text
authorization
```

Anchor:

```text
expires_on
```

Warning window: 30 calendar days.

### Procurement renewal due

Record type:

```text
procurement
```

Anchor:

```text
renewal_due_on
```

Warning window: 60 calendar days.

### Procurement expires

Record type:

```text
procurement
```

Anchor:

```text
ends_on
```

Warning window: 60 calendar days.

### Audit follow-up due

Record type:

```text
audit
```

Anchor:

```text
next_review_due_on
```

Warning window: 30 calendar days.

### Violation remediation due

Record type:

```text
violation
```

Anchor:

```text
remediation_due_on
```

Warning window: 14 calendar days.

### Data-sharing arrangement expires

Record type:

```text
data_sharing
```

Anchor:

```text
expires_on
```

Warning window: 30 calendar days.

## Exact public dates

Each configured date is treated as the due date itself.

The deadline definition therefore uses:

```yaml
offset:
  value: 0
  unit: calendarDays
dateOnlyAnchorTime: end
```

For example:

```text
2026-12-15
```

normalizes to:

```text
2026-12-15T23:59:59.999Z
```

This avoids manufacturing a new statutory or policy period that is not stated in
the source record.

## Public visibility

All PR 5 deadline definitions are explicitly public.

That means public record views may show:

- the deadline label;
- anchor date;
- due date;
- current state; and
- urgency such as open, due soon, or overdue.

No private deadline type is introduced by this PR.

## No editorial tolling

These deadlines represent external accountability dates.

They therefore do not pause simply because the registry record moves into a
different publication state.

For example, withdrawing a registry record does not postpone the public audit
date stated for the underlying deployment.

This is deliberate: the registry's editorial lifecycle must not silently alter
the real-world accountability date.

## Source-date corrections

When a configured source date changes through an ordinary record update, the
deadline engine automatically reconciles the deadline.

The immutable record history still preserves:

- the earlier stated date;
- the corrected date;
- actor attribution; and
- the reason for the correction.

The current deadline then reflects the most recent canonical record value.

## Missing dates

A deadline is materialized only when its configured anchor field contains a
valid date.

The registry does not invent due dates when an official source does not publish
one.

## Validation

PR 5 regression coverage verifies:

- all eight deadline definitions compile;
- every clock is explicitly public;
- warning windows match the configured policy;
- deployment records expose `next_audit_due_on`;
- representative records materialize the expected deadline instances;
- procurement records can materialize both renewal and expiration dates;
- changed source dates automatically update their deadlines; and
- withdrawal does not toll an external accountability date.
