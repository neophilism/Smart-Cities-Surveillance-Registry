# Smart Cities official-source adapters

PR 16 adds provider-specific source adapters in a downstream package while
continuing to reuse the Civic Registry engine's provider-neutral retrieval
boundary.

## Architecture boundary

The generic package remains:

```text
@civic-registry/source-adapters
```

It owns:

- HTTPS-only retrieval;
- explicit host allowlists;
- DNS checks that block private, loopback, link-local, and reserved targets;
- redirect revalidation;
- response timeout and size limits;
- safe text, JSON, and binary retrieval;
- deterministic normalized-row serialization;
- canonical-URL deduplication; and
- SHA-256 adapter run manifests.

Smart Cities provider logic lives separately in:

```text
@smart-cities-surveillance-registry/source-adapters
```

No Socrata, ArcGIS, CKAN, procurement, or Smart Cities semantics are added to
the reusable engine contract.

## Supported adapter families

### Socrata

`createSocrataAdapter` supports Socrata-style JSON dataset endpoints.

It provides:

- bounded `$limit` / `$offset` pagination;
- optional deterministic `$order`;
- configured identity/title/canonical URL mappings; and
- configured provider-field → ingestion-row mappings.

### ArcGIS FeatureServer

`createArcGisFeatureServerAdapter` supports public ArcGIS FeatureServer layer
queries.

It:

- requests attributes only;
- explicitly sends `returnGeometry=false`;
- supports bounded `resultOffset` / `resultRecordCount` pagination;
- maps only configured attributes; and
- never copies provider geometry into normalized rows.

This is important for the PR 7 public-safety boundary: a public source may
contain precise geometry, but the adapter does not need to ingest it merely
because it exists.

### CKAN

`createCkanAdapter` supports CKAN `package_search` catalogs.

It normalizes:

- package identity;
- title and mapped metadata;
- canonical dataset URL; and
- public resource URLs as attachments.

Those resource URLs can later feed PR 17 document retrieval/extraction.

### Procurement exports

`createProcurementExportAdapter` supports official public exports in:

- CSV;
- JSON; and
- NDJSON.

It reuses the engine's structured-input decoder, so CSV quoting, JSON array
validation, NDJSON row errors, and deterministic row fingerprints use the same
parsing semantics as PR 15 ingestion.

### Official HTML/document catalogs

`createHtmlDocumentCatalogAdapter` scans allowlisted official HTML catalog
pages for public document/export links.

By default it recognizes common public-record file types including:

- PDF;
- CSV;
- JSON;
- XLS/XLSX; and
- DOC/DOCX.

A configurable link pattern can support provider-specific catalog conventions.

Links outside the adapter host allowlist are skipped with a structured warning.

## Normalized row contract

All provider families emit the existing generic adapter envelope:

```text
id
external_id
title
canonical_url
source_adapter
retrieved_at
attachment_urls (optional)
+ configured downstream fields
```

Provider adapters do not write records directly.

Their output is intended to flow through the PR 15 ingestion profiles, which
means:

- schema validation still applies;
- imported records remain reviewable drafts by default;
- immutable history still applies;
- source fingerprints remain available; and
- publication cannot be bypassed.

## Configuration example

A downstream Socrata adapter can be configured without changing the engine:

```ts
createSocrataAdapter({
  id: "city-surveillance-inventory",
  label: "City surveillance inventory",
  allowedHosts: ["data.example.gov"],
  endpoint:
    "https://data.example.gov/resource/abcd.json",
  orderBy: ":id",
  mapping: {
    recordIdField: ":id",
    titleField: "program_name",
    canonicalUrlField: "public_url",
    fieldMap: {
      name: "program_name",
      jurisdiction: "jurisdiction",
      deployment_status: "status",
      public_summary: "description"
    }
  }
})
```

Production adapters should use the exact official hostname and fields published
by the relevant government provider.

## Safety

Provider adapters are intentionally allowlist-first.

A URL supplied by source content does not expand the adapter's network access.
Retrieval remains constrained to the configured official host list.

The HTTP client rejects:

- HTTP/non-TLS source URLs;
- embedded URL credentials;
- non-allowlisted hosts;
- DNS answers resolving to private/reserved destinations;
- unsafe redirects;
- oversized responses; and
- unexpected JSON content types.

## Testing

CI uses synthetic `.example.gov` / `.example` providers and mocked source
clients. It never contacts live government systems.

Tests cover:

- Socrata pagination and mapping;
- ArcGIS attribute-only normalization;
- CKAN resource discovery;
- CSV procurement export decoding;
- HTML document-catalog discovery;
- max-item limits;
- omission of unmapped provider objects/geometry; and
- hardened JSON content-type validation.
