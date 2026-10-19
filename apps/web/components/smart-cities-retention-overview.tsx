import type { PresentedField } from "@civic-registry/registry";
import { publicRetentionStatus } from "../lib/retention-public";

export function SmartCitiesRetentionOverview({
  recordTypeId, fields,
}: {
  recordTypeId: string;
  fields: PresentedField[];
}) {
  if (recordTypeId !== "deployment") return null;
  // Only consume disclosure-projected fields; never query raw record data here.
  const status = publicRetentionStatus(fields);
  return (
    <section className="record-panel" aria-labelledby="retention-projection-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Data governance</p>
          <h2 id="retention-projection-heading">Retention and deletion</h2>
        </div>
      </div>
      <dl className="detail-list">
        <div>
          <dt>Published maximum retention period</dt>
          <dd>{status.publishedMaximumRetentionDays ? status.publishedMaximumRetentionDays + " days" : "Not publicly documented"}</dd>
        </div>
        <div>
          <dt>Published retention basis</dt>
          <dd>{status.publishedRetentionBasis ?? "Not publicly documented"}</dd>
        </div>
        <div>
          <dt>Verified physical deletion</dt>
          <dd>Not verified by this registry</dd>
        </div>
      </dl>
      <p className="notice">
        A published retention policy or reported completion is not evidence that
        all stored copies were physically deleted.
      </p>
    </section>
  );
}
