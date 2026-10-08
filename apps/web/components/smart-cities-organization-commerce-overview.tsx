import Link from "next/link";
import type {
  PresentedField,
  PresentedRelationship,
  PresentedRelationshipGraph,
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

function graphLinks(
  graph: PresentedRelationshipGraph | undefined,
  recordTypeIds: string[],
  registryId: string,
) {
  const nodes =
    graph?.nodes.filter(
      (node) =>
        !node.root &&
        recordTypeIds.includes(
          node.record.recordTypeId,
        ),
    ) ?? [];

  const unique = [
    ...new Map(
      nodes.map((node) => [
        node.record.id,
        node,
      ]),
    ).values(),
  ];

  if (unique.length === 0) {
    return (
      <span className="empty-value">
        No public connection recorded
      </span>
    );
  }

  return (
    <div className="smart-record__links">
      {unique.map((node) => (
        <Link
          key={node.record.id}
          href={href(
            registryId,
            node.record.id,
          )}
        >
          {node.record.title}
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

export function SmartCitiesOrganizationCommerceOverview({
  registryId,
  recordTypeId,
  fields,
  relationships,
  graph,
  evidenceCount,
  deadlineCount,
}: {
  registryId: string;
  recordTypeId: string;
  fields: PresentedField[];
  relationships: PresentedRelationship[];
  graph?: PresentedRelationshipGraph;
  evidenceCount: number;
  deadlineCount: number;
}) {
  if (recordTypeId === "agency") {
    return (
      <section
        className="smart-record"
        aria-labelledby="agency-overview-heading"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              Agency accountability
            </p>
            <h2 id="agency-overview-heading">
              What this public body operates,
              authorizes, buys, and oversees
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
              Agency profile
            </span>
            <dl className="smart-record__facts">
              <div>
                <dt>Jurisdiction</dt>
                <dd>
                  {display(
                    fields,
                    "jurisdiction",
                  )}
                </dd>
              </div>
              <div>
                <dt>Agency type</dt>
                <dd>
                  {display(
                    fields,
                    "agency_type",
                  )}
                </dd>
              </div>
              <div>
                <dt>Public records</dt>
                <dd>
                  {display(
                    fields,
                    "public_records_url",
                  )}
                </dd>
              </div>
            </dl>
          </article>

          <article className="smart-record__card">
            <span className="smart-record__label">
              Deployments operated
            </span>
            {links(
              relationships,
              ["operated-by"],
              registryId,
            )}
          </article>

          <article className="smart-record__card">
            <span className="smart-record__label">
              Procurements
            </span>
            {links(
              relationships,
              ["procurement-by"],
              registryId,
            )}
          </article>

          <article className="smart-record__card">
            <span className="smart-record__label">
              Policies administered
            </span>
            {links(
              relationships,
              ["policy-issued-by"],
              registryId,
            )}
          </article>

          <article className="smart-record__card">
            <span className="smart-record__label">
              Authorizations issued
            </span>
            {links(
              relationships,
              ["authorization-issued-by"],
              registryId,
            )}
          </article>

          <article className="smart-record__card">
            <span className="smart-record__label">
              Audits / assessments
            </span>
            {links(
              relationships,
              ["audit-by-agency"],
              registryId,
            )}
          </article>

          <article className="smart-record__card">
            <span className="smart-record__label">
              Data-sharing arrangements
            </span>
            {links(
              relationships,
              [
                "data-sharing-source",
                "data-sharing-recipient",
              ],
              registryId,
            )}
          </article>
        </div>
      </section>
    );
  }

  if (recordTypeId === "vendor") {
    return (
      <section
        className="smart-record"
        aria-labelledby="vendor-overview-heading"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              Vendor accountability
            </p>
            <h2 id="vendor-overview-heading">
              What this vendor supplies and
              where public money connects
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
              Vendor profile
            </span>
            <dl className="smart-record__facts">
              <div>
                <dt>Legal name</dt>
                <dd>
                  {display(
                    fields,
                    "legal_name",
                  )}
                </dd>
              </div>
              <div>
                <dt>Vendor type</dt>
                <dd>
                  {display(
                    fields,
                    "vendor_type",
                  )}
                </dd>
              </div>
              <div>
                <dt>Headquarters</dt>
                <dd>
                  {display(
                    fields,
                    "headquarters",
                  )}
                </dd>
              </div>
            </dl>
          </article>

          <article className="smart-record__card">
            <span className="smart-record__label">
              Technologies supplied
            </span>
            {links(
              relationships,
              ["supplied-by"],
              registryId,
            )}
          </article>

          <article className="smart-record__card">
            <span className="smart-record__label">
              Contracts / procurements
            </span>
            {links(
              relationships,
              ["procurement-with"],
              registryId,
            )}
          </article>

          <article className="smart-record__card">
            <span className="smart-record__label">
              Connected deployments
            </span>
            {graphLinks(
              graph,
              ["deployment"],
              registryId,
            )}
          </article>

          <article className="smart-record__card">
            <span className="smart-record__label">
              Connected agencies
            </span>
            {graphLinks(
              graph,
              ["agency"],
              registryId,
            )}
          </article>
        </div>
      </section>
    );
  }

  if (recordTypeId === "procurement") {
    const amount = display(
      fields,
      "amount",
      "",
    );
    const currency = display(
      fields,
      "currency",
      "",
    );

    return (
      <section
        className="smart-record"
        aria-labelledby="procurement-overview-heading"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              Procurement accountability
            </p>
            <h2 id="procurement-overview-heading">
              Follow the spending from agency
              to vendor, technology, and deployment
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
              Procurement profile
            </span>
            <dl className="smart-record__facts">
              <div>
                <dt>Type</dt>
                <dd>
                  {display(
                    fields,
                    "procurement_type",
                  )}
                </dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  {display(
                    fields,
                    "procurement_status",
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
              Public amount
            </span>
            <strong>
              {amount
                ? [
                    currency,
                    amount,
                  ]
                    .filter(Boolean)
                    .join(" ")
                : "Not specified"}
            </strong>
            <p>
              Awarded:{" "}
              {display(
                fields,
                "awarded_on",
              )}
            </p>
          </article>

          <article className="smart-record__card">
            <span className="smart-record__label">
              Contract term
            </span>
            <strong>
              {display(
                fields,
                "starts_on",
              )}{" "}
              →{" "}
              {display(
                fields,
                "ends_on",
              )}
            </strong>
            <p>
              Renewal due:{" "}
              {display(
                fields,
                "renewal_due_on",
              )}
            </p>
          </article>

          <article className="smart-record__card">
            <span className="smart-record__label">
              Procuring agency
            </span>
            {links(
              relationships,
              ["procurement-by"],
              registryId,
            )}
          </article>

          <article className="smart-record__card">
            <span className="smart-record__label">
              Vendor
            </span>
            {links(
              relationships,
              ["procurement-with"],
              registryId,
            )}
          </article>

          <article className="smart-record__card">
            <span className="smart-record__label">
              Technology acquired
            </span>
            {links(
              relationships,
              ["procures-technology"],
              registryId,
            )}
          </article>

          <article className="smart-record__card">
            <span className="smart-record__label">
              Related deployments
            </span>
            {links(
              relationships,
              ["procured-through"],
              registryId,
            )}
          </article>
        </div>
      </section>
    );
  }

  return null;
}
