import { PostgresExternalComplianceRepository } from "../../../../../packages/smart-cities-compliance/src/store.ts";
import { requireAdminSession } from "../../../lib/admin-auth.ts";
import { getDatabasePool } from "../../../lib/database.ts";
import { AdminShell } from "../../../components/admin-shell.tsx";

export const dynamic = "force-dynamic";
export default async function ExternalCompliancePage({
  searchParams,
}: {
  searchParams: Promise<{ registryId?: string | string[]; recordId?: string | string[] }>;
}) {
  const session = await requireAdminSession();
  const params = await searchParams;
  const registryId = typeof params.registryId === "string" ? params.registryId.trim() : "";
  const recordId = typeof params.recordId === "string" ? params.recordId.trim() : "";
  const invalidIds = registryId.length > 200 || recordId.length > 200;
  const claims = registryId && recordId && !invalidIds
    ? await new PostgresExternalComplianceRepository(getDatabasePool()).listForRecord(registryId, recordId)
    : [];
  return (
    <AdminShell session={session} title="External accountability evidence" subtitle="Provider statements are evidence for review. They do not approve publication or establish compliance.">
      <form className="admin-form" method="get" action="/admin/external-compliance">
        <div className="admin-form__grid">
          <label htmlFor="registryId"><span>Registry ID</span><input id="registryId" name="registryId" required maxLength={200} defaultValue={registryId} /></label>
          <label htmlFor="recordId"><span>Record ID</span><input id="recordId" name="recordId" required maxLength={200} defaultValue={recordId} /></label>
        </div>
        <button type="submit">Show evidence</button>
      </form>
      {invalidIds ? <p role="alert">Registry and record IDs must be 200 characters or fewer.</p> : null}
      {registryId && recordId && !invalidIds ? (
        <section aria-label="External claims">
          <h2>{claims.length} sourced statements</h2>
          {claims.length === 0 ? <p>No imported statements for this record.</p> : (
            <ul>
              {claims.map((claim) => (
                <li key={claim.providerId + ":" + claim.sourceId + ":" + claim.kind + ":" + claim.observedAt}>
                  <strong>{claim.kind}</strong>: {claim.assertion}
                  <p>Provider: {claim.providerId}. Source: <a href={claim.sourceUrl} rel="noopener noreferrer">{claim.sourceId}</a>. Observed: <time dateTime={claim.observedAt}>{claim.observedAt}</time>. Imported: <time dateTime={claim.importedAt}>{claim.importedAt}</time>. Audit ID: <code>{claim.importId}</code>.</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </AdminShell>
  );
}
