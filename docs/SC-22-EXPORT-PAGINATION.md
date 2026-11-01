# SC-22 bounded export pagination

Page-number search uses an offset derived from both page and page size. The
previous export loop reduced pageSize to the remaining record budget. With a
150-record budget, page two therefore used offset 50 rather than 100, repeating
50 records and omitting later records while reporting 150 exported.

The export loop now fixes pageSize for the entire request and trims the final
page after the public search projection. It preserves the requested filter/sort,
public/redacted projection, maximum export budget and total/truncation metadata.
maxRecords also rejects decimal, exponent, empty and trailing-junk values rather
than accepting a parseInt prefix. An omitted limit still defaults to 10000.

The database integration regression seeds 210 additional public organizations and
one private organization. It checks exact ordered identities, uniqueness, public
census, truncation headers and private-value exclusion for limits below, at and
above page boundaries, including 101 and 150. Invalid limit cases require the
machine-readable invalid_export_limit error. Actual database execution and full
typecheck/build are delegated to current-head CI; local syntax checks alone do
not establish those passes. No stable cross-request snapshot is claimed when
records are concurrently changed during an export.
