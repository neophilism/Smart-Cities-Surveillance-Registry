# SC-24 persisted source monitoring

The protected source-refresh administrator page now projects freshness from the
latest persisted completed/completed-with-warnings source run for each job. A
recent failed attempt is still shown as failing scheduler health and cannot
refresh the age of prior successful evidence. Disabled scheduler state is kept
separate from source freshness. The page does not fetch any remote source.

Each observation includes registry/job identity, server observation time, last
success time, successful run ID, output SHA-256 when recorded, and a validated
HTTPS source reference. Missing, invalid, future or unfinished evidence remains
unknown; unsafe URL schemes or URL credentials cannot become links. Missing or
invalid source references are counted. Querying successful runs independently
of the 50-row recent-history table preserves older successes after many failures.

The last-24-hour operational window shows completed/failed/warning run counts and
failure percentage, plus an input-row update percentage from linked non-dry-run
ingestion runs. The denominator is recorded total input rows, including rows that
failed ingestion; the numerator is updated rows. This measures source-driven
updates, not verified factual corrections. An absent denominator is unknown,
never a manufactured zero-percent observation.

Registry-level correction monitoring counts record.fields_changed audit events
whose recorded actor is nonnull and whose reason starts with "Correction: "
followed by a nonblank explanation. Operators can use the existing authenticated
record-update reason field; no new mutation route is added. The denominator is
all audited field-change events in the same registry and time window. The page
labels this operator-declared correction share, not a factual-accuracy finding.
Ordinary updates do not silently become corrections. No field changes yields an
unknown rate. The immutable event retains actor, explanation and record identity;
the monitoring query returns only aggregate counts to authenticated admins.

Database queries bind registry identity on both source and ingestion sides and
use explicit window timestamps. The existing administrator session check runs
before the reads. No new public API, background job, permissions, production
source activation, site-availability metric or scheduler cadence change is added.
The displayed manual worker command is corrected to db:refresh-official.

Eight isolated freshness/monitoring tests pass under Node 24.22.1. PostgreSQL
integration adds successful-provenance retention after failure, registry/window
isolation and aggregate-count checks. Current-head CI must verify database,
typecheck and build behavior. Assistive-technology runtime QA remains distinct
from source review; the new text uses the existing semantic admin cards and
descriptive external links.
