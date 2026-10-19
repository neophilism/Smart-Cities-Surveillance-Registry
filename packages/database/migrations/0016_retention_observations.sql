CREATE TABLE IF NOT EXISTS civic_smart_city_retention_observations (
 registry_id TEXT NOT NULL,
 record_id TEXT NOT NULL,
 source_url TEXT NOT NULL,
 observed_at TIMESTAMPTZ NOT NULL,
 policy TEXT NOT NULL,
 obligation TEXT NOT NULL,
 reported_fulfillment TEXT NOT NULL CHECK (reported_fulfillment IN ('not_reported','reported_complete','reported_incomplete')),
 source_verification TEXT NOT NULL CHECK (source_verification IN ('unverified','independently_verified')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY (registry_id,record_id,source_url,observed_at,policy,obligation),
 FOREIGN KEY (registry_id,record_id) REFERENCES civic_registry_records(registry_id,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS civic_smart_city_retention_recent_idx ON civic_smart_city_retention_observations (registry_id,record_id,observed_at DESC);
