-- Scoped, append-only source assertions. These rows confer no permission or certification.
CREATE TABLE smart_cities_external_claim_imports (
  id UUID PRIMARY KEY,
  registry_id TEXT NOT NULL,
  record_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('completed', 'failed')),
  received_count INTEGER NOT NULL CHECK (received_count >= 0),
  inserted_count INTEGER NOT NULL CHECK (inserted_count >= 0),
  error_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (registry_id, record_id)
    REFERENCES civic_registry_records(registry_id, id) ON DELETE CASCADE
);
CREATE INDEX smart_cities_external_claim_imports_record_idx
  ON smart_cities_external_claim_imports (registry_id, record_id, created_at DESC);

CREATE TABLE smart_cities_external_claims (
  registry_id TEXT NOT NULL,
  record_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('authorization', 'accountability', 'audit')),
  observed_at TIMESTAMPTZ NOT NULL,
  source_url TEXT NOT NULL,
  assertion TEXT NOT NULL,
  import_id UUID NOT NULL REFERENCES smart_cities_external_claim_imports(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (registry_id, record_id, provider_id, source_id, kind, observed_at),
  FOREIGN KEY (registry_id, record_id)
    REFERENCES civic_registry_records(registry_id, id) ON DELETE CASCADE
);
CREATE INDEX smart_cities_external_claims_record_idx
  ON smart_cities_external_claims (registry_id, record_id, observed_at DESC);
