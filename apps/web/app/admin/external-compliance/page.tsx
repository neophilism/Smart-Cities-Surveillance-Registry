import { PostgresExternalComplianceRepository } from "../../../../../packages/smart-cities-compliance/src/store.ts";
import { requireAdminSession } from "../../../lib/admin-auth.ts";
import { getDatabasePool } from "../../../lib/database.ts";
import { AdminShell } from "../../../components/admin-shell.tsx";

export const dynamic = "force-dynamic";
export default async function ExternalCompliancePage({
  searchParams,
}: {
  searchParams: Promise<{ registryId?: string; recordId?: string }>;
}) {
  const session = await requireAdminSession();
  const params = await searchParams;
  const registryId = (params.registryId ?? "").trim();
  const recordId = (params.recordId ?? "").trim();
  const claims = registryId && recordId && registryId.length <= 200 && recordId.length <= 200
    ? await new PostgresExternalComplianceRepository(getDatabasePool()).listForRecord(registryId, recordId)
    : [];
  return (
    <AdminShell session={session} title="External accountability evidence" subtitle="Provider statements are evidence for review. They do not approve publication or establish compliance.">
      <form method="get" action="/admin/external-compliance">
        <label htmlFor="registryId">Registry ID</label>
        <input id="registryId" name="registryId" required maxLength={200} defaultValue={registryId} />
        <label htmlFor="recordId">Record ID</label>
        <input id="recordId" name="recordId" required maxLength={200} defaultValue={recordId} />
        <button type="submit">Show evidence</button>
      </form>
      {registryId && recordId ? (
        <section aria-label="External claims">
          <h2>{claims.length} sourced statements</h2>
          {claims.length === 0 ? <p>No imported statements for this record.</p> : (
            <ul>
              {claims.map((claim) => (
                <li key={claim.providerId + ":" + claim.sourceId + ":" + claim.kind + ":" + claim.observedAt}>
                  <strong>{claim.kind}</strong>: {claim.assertion}
                  <p>Provider: {claim.providerId}. Source: <a href={claim.sourceUrl} rel="noopener noreferrer">{claim.sourceId}</a>. Observed: <time dateTime={claim.observedAt}>{claim.observedAt}</time>.</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </AdminShell>
  );
}
