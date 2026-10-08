# Jurisdiction explorer and public-safe mapping

PR 14 adds a public jurisdiction explorer built from published deployment and
agency records.

## Jurisdiction index

The public `/jurisdictions` page summarizes each jurisdiction with:

- deployment count;
- active deployment count; and
- public agency count.

Jurisdictions appear automatically when published deployment or agency records
contain a public `jurisdiction` value.

## Jurisdiction detail

Each jurisdiction page shows:

- total connected public accountability records;
- deployment, agency, technology, vendor, and incident counts;
- public deployments in the jurisdiction;
- upcoming public deadlines from connected records; and
- browse links for every registry record type constrained to that jurisdiction.

The connected-record counts use the PR 13 graph-aware jurisdiction filter.

## Public-safe map

The jurisdiction page includes a schematic public-area map built only from the
published `public_location_scope` field.

It intentionally does **not**:

- geocode deployments;
- display device pins;
- infer coordinates;
- expose live topology; or
- manufacture geography for records that do not publish it.

The map groups deployments by broad public descriptions such as a district,
public-right-of-way area, parking-facility group, or similar jurisdiction-level
scope.

The interface explicitly labels the view as schematic and warns that it is not
a device-location map.

## Disclosure and safety

Whole-record-withheld deployments are excluded from:

- jurisdiction counts;
- deployment lists;
- map scopes; and
- jurisdiction deadline cards.

The map consumes `public_fields`, and integration tests run each map scope
through the PR 7 public-safety scanner.

## Validation

PR 14 tests verify:

- Harborview appears with the expected deployment/agency counts;
- jurisdiction detail exposes the connected accountability network;
- public accountability deadlines are included;
- the two synthetic location scopes contain no precise coordinates; and
- whole-record withholding removes a deployment from jurisdiction counts and
  map output.
