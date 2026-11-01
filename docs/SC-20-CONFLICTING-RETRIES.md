# SC-20 conflicting retry protection

The original store rejected contradictory duplicates in one batch, but its
database ON CONFLICT DO NOTHING treated later contradictory deliveries as
successful retries. The stored assertion survived, but the later import was
incorrectly reported completed.

After a unique-key conflict, storage now reads the existing assertion and source
URL using the complete registry/record/provider/source/kind/observation key. Only
identical content counts as an idempotent retry. Contradictory content or a missing
conflicting row throws a fixed error and rolls back the entire import, including
earlier new facts and its completed audit row. No existing assertion is updated.

The unique insert waits for a concurrent winner; under PostgreSQL's default
READ COMMITTED isolation, the next lookup sees that committed result. Equivalent
timestamp offsets use the database timestamp key. Concurrent contradictory
deliveries must yield exactly one successful transaction.

Local verification: Node 24.22.1, cleared environment, nine store tests passed.
The two new unit tests failed against the previous implementation. PostgreSQL
integration coverage additionally checks later conflicting assertion/URL retries,
equivalent timestamp offsets, whole-batch rollback, audit rollback and concurrent
contradictory imports. Those database cases require actual current-head CI; they
were not run against a local database. No live provider or production claim is
made.
