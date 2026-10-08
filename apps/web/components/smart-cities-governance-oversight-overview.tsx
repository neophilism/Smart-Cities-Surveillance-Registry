import Link from "next/link";
import type {
  PresentedField,
  PresentedRelationship,
} from "@civic-registry/registry";

function display(
  fields: PresentedField[],
  id: string,
  fallback = "Not specified",
): string {
  const field = fields.find(
    (candidate) => candidate.id === id,
  );

  if (!field || field.empty) {
    return fallback;
  }

  return field.displayValue;
}

function href(
  registryId: string,
  recordId: string,
): string {
  return (
    "/registries/" +
    encodeURIComponent(registryId) +
    "/records/" +
    encodeURIComponent(recordId)
  );
}

function links(
  relationships: PresentedRelationship[],
  relationshipTypeIds: string[],
  registryId: string,
) {
  const matches = relationships.filter(
    (relationship) =>
      relationshipTypeIds.includes(
        relationship.relationshipTypeId,
      ),
  );

  if (matches.length === 0) {
    return (
      <span className="empty-value">
        No public connection recorded
      </span>
    );
  }

  return (
    <div className="smart-record__links">
      {matches.map((relationship) => (
        <Link
          key={relationship.id}
          href={href(
            registryId,
            relationship.relatedRecord.id,
          )}
        >
          {relationship.relatedRecord.title}
        </Link>
      ))}
    </div>
  );
}

function signal(
  evidenceCount: number,
  deadlineCount: number,
) {
  return (
    <div className="smart-record__signal">
      <span>
        {evidenceCount} evidence
        {evidenceCount === 1
          ? " citation"
          : " citations"}
      </span>
      {deadlineCount > 0 ? (
        <span>
          {deadlineCount} public
          {deadlineCount === 1
            ? " deadline"
            : " deadlines"}
        </span>
      ) : null}
    </div>
  );
}

export function SmartCitiesGovernanceOversightOverview({
  registryId,
  recordTypeId,
  fields,
  relationships,
  evidenceCount,
  deadlineCount,
}: {
  registryId: string;
  recordTypeId: string;
  fields: PresentedField[];
  relationships: PresentedRelationship[];
  evidenceCount: number;
  deadlineCount: number;
}) {
  if (recordTypeId === "policy") {
    return (
      <section
        className="smart-record"
        aria-labelledby="policy-overview-heading"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              Governance
            </p>
            <h2 id="policy-overview-heading">
              What rule governs the system
              and when it must be reviewed
            </h2>
          </div>
          {signal(
            evidenceCount,
            deadlineCount,
          )}
        </div>

        <div className="smart-record__grid">
          <article className="smart-record__card smart-record__card--wide">
            <span className="smart-record__label">
              Policy profile
            </span>
            <dl className="smart-record__facts">
              <div>
                <dt>Type</dt>
                <dd>
                  {display(
                    fields,
                    "policy_type",
                  )}
                </dd>
              </div>
              <div>
                <dt>Authority level</dt>
                <dd>
                  {display(
                    fields,
                    "authority_level",
                  )}
                </dd>
              </div>
              <div>
                <dt>Citation / number</dt>
                <dd>
                  {display(
                    fields,
                    "citation_or_number",
                  )}
                </dd>
              </div>
            </dl>
          </article>

          <article className="smart-record__card">
            <span className="smart-record__label">
              Status
            </span>
            <strong>
              {display(
                fields,
                "policy_status",
              )}
            </strong>
            <p>
              Effective:{" "}
              {display(
                fields,
                "effective_on",
              )}
            </p>
          </article>

          <article className="smart-record__card">
            <span className="smart-record__label">
              Review cycle
            </span>
            <strong>
              Review due{" "}
              {display(
                fields,
                "review_due_on",
              )}
            </strong>
            <p>
              Adopted:{" "}
              {display(
                fields,
                "adopted_on",
              )}
            </p>
          </article>

          <article className="smart-record__card">
            <span className="smart-record__label">
              Issued / administered by
            </span>
            {links(
              relationships,
              ["policy-issued-by"],
              registryId,
            )}
          </article>

          <article className="smart-record__card">
            <span className="smart-record__label">
              Deployments governed
            </span>
            {links(
              relationships,
              ["governed-by"],
              registryId,
            )}
          </article>

          <article className="smart-record__card">
            <span className="smart-record__label">
              Data sharing governed
            </span>
            {links(
              relationships,
              [
                "data-sharing-governed-by",
              ],
              registryId,
            )}
          </article>
        </div>
      </section>
    );
  }

  if (recordTypeId === "authorization") {
    return (
      <section
        className="smart-record"
        aria-labelledby="authorization-overview-heading"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              Public authorization
            </p>
            <h2 id="authorization-overview-heading">
              Who approved it, under what
              conditions, and for how long
            </h2>
          </div>
          {signal(
            evidenceCount,
            deadlineCount,
          )}
        </div>

        <div className="smart-record__grid">
          <article className="smart-record__card smart-record__card--wide">
            <span className="smart-record__label">
              Authorization profile
            </span>
            <dl className="smart-record__facts">
              <div>
                <dt>Type</dt>
                <dd>
                  {display(
                    fields,
                    "authorization_type",
                  )}
                </dd>
              </div>
              <div>
                <dt>Approving body</dt>
                <dd>
                  {display(
                    fields,
                    "approving_body",
                  )}
                </dd>
              </div>
              <div>
                <dt>Reference</dt>
                <dd>
                  {display(
                    fields,
                    "reference_number",
                  )}
                </dd>
              </div>
            </dl>
          </article>

          <article className="smart-record__card">
            <span className="smart-record__label">
              Status / term
            </span>
            <strong>
              {display(
                fields,
                "authorization_status",
              )}
            </strong>
            <p>
              Effective{" "}
              {display(
                fields,
                "effective_on",
              )}{" "}
              · expires{" "}
              {display(
                fields,
                "expires_on",
              )}
            </p>
          </article>

          <article className="smart-record__card smart-record__card--wide">
            <span className="smart-record__label">
              Conditions / limitations
            </span>
            <strong>
              {display(
                fields,
                "conditions",
              )}
            </strong>
          </article>

          <article className="smart-record__card">
            <span className="smart-record__label">
              Issued by
            </span>
            {links(
              relationships,
              [
                "authorization-issued-by",
              ],
              registryId,
            )}
          </article>

          <article className="smart-record__card">
            <span className="smart-record__label">
              Deployments authorized
            </span>
            {links(
              relationships,
              ["authorized-by"],
              registryId,
            )}
          </article>
        </div>
      </section>
    );
  }

  if (recordTypeId === "audit") {
    return (
      <section
        className="smart-record"
        aria-labelledby="audit-overview-heading"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              Oversight
            </p>
            <h2 id="audit-overview-heading">
              What the review found and what
              happens next
            </h2>
          </div>
          {signal(
            evidenceCount,
            deadlineCount,
          )}
        </div>

        <div className="smart-record__grid">
          <article className="smart-record__card smart-record__card--wide">
            <span className="smart-record__label">
              Assessment profile
            </span>
            <dl className="smart-record__facts">
              <div>
                <dt>Assessment type</dt>
                <dd>
                  {display(
                    fields,
                    "assessment_type",
                  )}
                </dd>
              </div>
              <div>
                <dt>Assessor</dt>
                <dd>
                  {display(
                    fields,
                    "assessor",
                  )}
                </dd>
              </div>
              <div>
                <dt>Overall status</dt>
                <dd>
                  {display(
                    fields,
                    "overall_status",
                  )}
                </dd>
              </div>
            </dl>
          </article>

          <article className="smart-record__card">
            <span className="smart-record__label">
              Review period
            </span>
            <strong>
              {display(
                fields,
                "period_start",
              )}{" "}
              →{" "}
              {display(
                fields,
                "period_end",
              )}
            </strong>
            <p>
              Completed:{" "}
              {display(
                fields,
                "completed_on",
              )}
            </p>
          </article>

          <article className="smart-record__card">
            <span className="smart-record__label">
              Next review
            </span>
            <strong>
              {display(
                fields,
                "next_review_due_on",
              )}
            </strong>
          </article>

          <article className="smart-record__card smart-record__card--wide">
            <span className="smart-record__label">
              Recommendations
            </span>
            <strong>
              {display(
                fields,
                "recommendations",
              )}
            </strong>
          </article>

          <article className="smart-record__card">
            <span className="smart-record__label">
              Deployment reviewed
            </span>
            {links(
              relationships,
              ["audits-deployment"],
              registryId,
            )}
          </article>

          <article className="smart-record__card">
            <span className="smart-record__label">
              Conducted / commissioned by
            </span>
            {links(
              relationships,
              ["audit-by-agency"],
              registryId,
            )}
          </article>

          <article className="smart-record__card">
            <span className="smart-record__label">
              Incidents identified
            </span>
            {links(
              relationships,
              ["identified-by-audit"],
              registryId,
            )}
          </article>
        </div>
      </section>
    );
  }

  if (recordTypeId === "violation") {
    return (
      <section
        className="smart-record"
        aria-labelledby="violation-overview-heading"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              Accountability event
            </p>
            <h2 id="violation-overview-heading">
              What happened, how serious it
              was, and whether it was fixed
            </h2>
          </div>
          {signal(
            evidenceCount,
            deadlineCount,
          )}
        </div>

        <div className="smart-record__grid">
          <article className="smart-record__card smart-record__card--wide">
            <span className="smart-record__label">
              Incident profile
            </span>
            <dl className="smart-record__facts">
              <div>
                <dt>Type</dt>
                <dd>
                  {display(
                    fields,
                    "incident_type",
                  )}
                </dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  {display(
                    fields,
                    "incident_status",
                  )}
                </dd>
              </div>
              <div>
                <dt>Severity</dt>
                <dd>
                  {display(
                    fields,
                    "severity",
                  )}
                </dd>
              </div>
            </dl>
          </article>

          <article className="smart-record__card">
            <span className="smart-record__label">
              Timeline
            </span>
            <strong>
              Reported{" "}
              {display(
                fields,
                "reported_on",
              )}
            </strong>
            <p>
              Occurred:{" "}
              {display(
                fields,
                "occurred_on",
              )}
            </p>
          </article>

          <article className="smart-record__card">
            <span className="smart-record__label">
              Remediation deadline
            </span>
            <strong>
              {display(
                fields,
                "remediation_due_on",
              )}
            </strong>
            <p>
              Resolved:{" "}
              {display(
                fields,
                "resolved_on",
              )}
            </p>
          </article>

          <article className="smart-record__card smart-record__card--wide">
            <span className="smart-record__label">
              Remediation
            </span>
            <strong>
              {display(
                fields,
                "remediation",
              )}
            </strong>
          </article>

          <article className="smart-record__card">
            <span className="smart-record__label">
              Deployment concerned
            </span>
            {links(
              relationships,
              ["concerns-deployment"],
              registryId,
            )}
          </article>

          <article className="smart-record__card">
            <span className="smart-record__label">
              Identified by
            </span>
            {links(
              relationships,
              ["identified-by-audit"],
              registryId,
            )}
          </article>
        </div>
      </section>
    );
  }

  return null;
}
