# Smart Cities accountability graph

PR 3 connects the domain records introduced in PR 2 into a typed accountability
graph using the Civic Registry engine's existing relationship and bounded graph
infrastructure.

The graph is declarative. Relationship semantics live in
`config/registry.yaml`; the database and public graph interfaces remain generic.

## Core deployment paths

A surveillance deployment may connect to:

- the technology it **uses**;
- the public agency that **operates** it;
- the approval or authorization that **authorizes** it;
- the policy or law that **governs** it;
- the procurement instrument through which it was **procured**;
- audits or assessments that **audit** it;
- violations or incidents that **concern** it; and
- data-sharing arrangements that **apply to** it.

These paths make a deployment the natural starting point for public
accountability exploration without making it the only useful graph root.

## Technology and procurement paths

Technology records may connect to vendors through `supplied-by`.

Procurements may connect to:

- the agency conducting the procurement;
- the vendor or contractor;
- the technology acquired; and
- the deployment funded or acquired through the procurement.

This allows a user to traverse, for example:

```text
deployment
  -> procurement
  -> vendor
```

or:

```text
deployment
  -> technology
  -> vendor
```

without duplicating vendor identity on every deployment record.

## Authorization and policy paths

Deployments may be linked to formal authorization records and governing policy
records.

Authorizations and policies can also link to the public agency that issued or
administers them when that body is represented in the registry.

This supports paths such as:

```text
deployment
  -> authorization
  -> agency
```

and:

```text
deployment
  -> policy
  -> agency
```

## Oversight and incident paths

An audit or assessment can link to:

- the deployment it evaluates; and
- the public agency that conducted or commissioned it.

A violation or incident can link to:

- the deployment it concerns; and
- the audit or assessment that identified or documented it.

The incident record remains distinct from the audit record so allegations,
findings, remediation, and oversight documents do not collapse into one entity.

## Data-sharing paths

A data-sharing arrangement may link to:

- the deployment whose data is covered;
- the originating public agency;
- a public-agency recipient; and
- the governing policy or law.

Two different agency relationships are intentionally used:

- `data-sharing-source`; and
- `data-sharing-recipient`.

That preserves semantic direction when both endpoints have the same record
type.

## Typed endpoint enforcement

Each relationship type constrains its permitted source and target record types.

For example:

```text
uses-technology
  source: deployment
  target: technology

supplied-by
  source: technology
  target: vendor
```

The persistence layer validates those constraints before creating a
relationship. A public agency therefore cannot accidentally be stored as the
source of a `uses-technology` edge.

## Directed labels

All Smart Cities PR 3 relationships are directed and define both a forward and
inverse label.

For example:

```text
Deployment --Uses technology--> Technology
Deployment <--Used by deployment-- Technology
```

The public relationship presentation chooses the correct label based on the
record being viewed.

## Bounded traversal

The application uses the engine's PostgreSQL relationship graph rather than a
separate graph database.

Traversal remains:

- depth-limited;
- cycle-safe;
- visibility-aware;
- relationship-type filterable; and
- node-capped.

The graph can therefore support ordinary public accountability exploration
without introducing another persistence system.

## PR 3 validation

Application tests verify:

- all 19 Smart Cities relationship types compile;
- source and target record-type constraints are correct;
- forward and inverse labels are usable;
- invalid endpoint types are rejected by persistence;
- a synthetic deployment produces the expected two-hop accountability graph;
  and
- relationship filters can isolate a procurement-to-vendor path.

Later PRs add publication/disclosure rules, deadlines, evidence, and real
ingestion workflows on top of this graph.
