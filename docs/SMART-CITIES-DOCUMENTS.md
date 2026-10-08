# Smart Cities document and PDF ingestion

PR 17 connects official-source attachment discovery to the Civic Registry
engine's generic document ingestion and extraction system.

## End-to-end flow

The downstream flow is:

```text
PR 16 provider adapter
  -> normalized row + attachment_urls
  -> external source identity match
  -> registry record
  -> hardened PDF fetch
  -> SHA-256 hash
  -> content-addressed storage
  -> PDF.js page extraction
  -> Source + versioned Document
  -> Citation
  -> extracted-text index
```

## Record association

`SmartCitiesDocumentIngestionService` matches adapter rows to registry records
using a stable external identifier.

The default identifier scheme is:

```text
official-record
```

This is the same scheme used by the PR 15 ingestion profiles.

An attachment is ingested only when exactly one registry record matches the
adapter row's external ID.

Rows with:

- no attachments;
- no matching record; or
- ambiguous record matches

are reported explicitly instead of guessing.

## Safe retrieval

Remote PDF bytes continue to use the generic hardened public-source client:

- HTTPS only;
- exact host allowlists;
- DNS private/reserved-address rejection;
- redirect revalidation;
- timeout limits; and
- response-size limits.

A remote content-type header is advisory. The document extractor still requires
a real PDF signature.

## Immutable document versions

The exact retrieved bytes are SHA-256 hashed.

Documents are versioned using both:

- canonical attachment URL identity; and
- content hash.

If an official URL later serves changed bytes, the new content becomes a new
document record with its own extraction and citation.

Earlier document versions remain preserved.

If the exact same bytes are retrieved again, storage/document/citation handling
is idempotent.

## Extraction

Textual PDFs are extracted page by page with the generic
`@civic-registry/documents` PDF.js extractor.

Each extraction preserves:

- extractor identity and version;
- page count;
- full extracted text;
- page-by-page text;
- extracted-text SHA-256;
- warnings; and
- extraction timestamp.

Scanned PDFs with no extractable text remain explicitly marked for later OCR
rather than silently producing invented content.

## Citation and page references

Each ingested attachment becomes evidence for the matched registry record.

The automatic citation preserves:

- source URL;
- exact versioned document;
- page range from page 1 through the extracted page count; and
- optional configured field association.

More precise field/page citation review can be performed later without losing
the original whole-document provenance.

## Searchable extracted text

Migration `0015_smart_cities_document_search.sql` adds a GIN full-text index to
the extracted-document table.

`searchSmartCitiesDocumentText` searches exact extracted text while returning
only safe metadata and matching page numbers.

It deliberately does **not** return raw text snippets.

Public extracted-text search requires:

- public record visibility;
- a publicly visible lifecycle state;
- a public citation;
- a public document/source;
- no whole-record withholding;
- no document withholding;
- no document redactions; and
- no field-level disclosure rule on a field-linked citation.

This prevents the search layer itself from becoming a side channel for redacted
or withheld evidence.

## Testing

PR 17 integration tests verify:

- adapter rows match registry records by stable official-source identity;
- PDF bytes are hashed and stored content-addressably;
- page text and text hashes are persisted;
- citations preserve source/document/page references;
- extracted text can be searched by page;
- changed bytes at one URL create a second immutable document version;
- repeated identical bytes remain idempotent;
- document redactions remove the extraction from public search; and
- unmatched source rows do not fetch or attach documents.
