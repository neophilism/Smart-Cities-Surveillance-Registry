-- Downstream Smart Cities document-search index.
-- Search exact extracted bytes while public presentation remains constrained by
-- evidence/disclosure/public-safety rules.

ALTER TABLE civic_registry_document_extractions
  ADD COLUMN IF NOT EXISTS search_document TSVECTOR
  GENERATED ALWAYS AS (
    to_tsvector(
      'simple',
      COALESCE(text_content, '')
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS
  smart_cities_document_extractions_search_idx
  ON civic_registry_document_extractions
  USING GIN (search_document);
