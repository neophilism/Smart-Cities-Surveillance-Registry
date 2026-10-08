import Link from "next/link";
import type {
  PresentedField,
  PresentedRelationship,
  PresentedRelationshipGraph,
} from "@civic-registry/registry";

function field(
  fields: PresentedField[],
  id: string,
): PresentedField | undefined {
  return fields.find(
    (candidate) => candidate.id === id,
  );
}

function display(
  fields: PresentedField[],
  id: string,
  fallback = "Not specified",
): string {
  const candidate = field(fields, id);

  if (
    !candidate ||
    candidate.empty
  ) {
    return fallback;
  }

  return candidate.displayValue;
}

function recordHref(
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

function relationshipLinks(
  relationships: PresentedRelationship[],
  ids: string[],
  registryId: string,
) {
  const matches =
    relationships.filter(
      (relationship) =>
        ids.includes(
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
          href={recordHref(
            registryId,
            relationship.relatedRecord.id,
          )}
        >
          {
            relationship.relatedRecord
              .title
          }
        </Link>
      ))}
    </div>
  );
}

function graphNodeLinks(
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
          href={recordHref(
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

export function SmartCitiesRecordOverview({
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
  if (
    recordTypeId !== "deployment" &&
    recordTypeId !== "technology"
  ) {
    return null;
  }

  if (recordTypeId === "technology") {
    return (
      <section
        className="smart-record"
        aria-labelledby="technology-overview-heading"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              Technology profile
            </p>
            <h2 id="technology-overview-heading">
              What the technology can do
            </h2>
          </div>
          <div className="smart-record__signal">
            <span>
              {evidenceCount} evidence
              {evidenceCount === 1
                ? " citation"
                : " citations"}
            </span>
          </div>
        </div>

        <div className="smart-record__grid">
          <article className="smart-record__card smart-record__card--wide">
            <span className="smart-record__label">
              Technology
            </span>
            <dl className="smart-record__facts">
              <div>
                <dt>Category</dt>
                <dd>
                  {display(
                    fields,
                    "category",
                  )}
                </dd>
              </div>
              <div>
                <dt>Manufacturer</dt>
                <dd>
                  {display(
                    fields,
                    "manufacturer",
                  )}
                </dd>
              </div>
              <div>
                <dt>Model / version</dt>
                <dd>
                  {[
                    display(
                      fields,
                      "model",
                      "",
                    ),
                    display(
                      fields,
                      "version",
                      "",
                    ),
                  ]
                    .filter(Boolean)
                    .join(" · ") ||
                    "Not specified"}
                </dd>
              </div>
            </dl>
          </article>

          <article className="smart-record__card">
            <span className="smart-record__label">
              Capabilities
            </span>
            <strong>
              {display(
                fields,
                "capability_categories",
              )}
            </strong>
            <p>
              Data:{" "}
              {display(
                fields,
                "data_categories",
              )}
            </p>
          </article>

          <article className="smart-record__card">
            <span className="smart-record__label">
              Automated features
            </span>
            <dl className="smart-record__mini-facts">
              <div>
                <dt>Real-time</dt>
                <dd>
                  {display(
                    fields,
                    "real_time_capable",
                  )}
                </dd>
              </div>
              <div>
                <dt>Biometric</dt>
                <dd>
                  {display(
                    fields,
                    "biometric_capable",
                  )}
                </dd>
              </div>
              <div>
                <dt>
                  Decision support
                </dt>
                <dd>
                  {display(
                    fields,
                    "automated_decision_support",
                  )}
                </dd>
              </div>
            </dl>
          </article>

          <article className="smart-record__card">
            <span className="smart-record__label">
              Supplier
            </span>
            {relationshipLinks(
              relationships,
              ["supplied-by"],
              registryId,
            )}
          </article>

          <article className="smart-record__card">
            <span className="smart-record__label">
              Used in deployments
            </span>
            {relationshipLinks(
              relationships,
              ["uses-technology"],
              registryId,
            )}
          </article>

          <article className="smart-record__card">
            <span className="smart-record__label">
              Procurement
            </span>
            {relationshipLinks(
              relationships,
              ["procures-technology"],
              registryId,
            )}
          </article>
        </div>
      </section>
    );
  }

  return (
    <section
      className="smart-record"
      aria-labelledby="deployment-overview-heading"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            Deployment accountability
          </p>
          <h2 id="deployment-overview-heading">
            What is deployed, why, and
            under whose authority
          </h2>
        </div>
        <div className="smart-record__signal">
          <span>
            {evidenceCount} evidence
            {evidenceCount === 1
              ? " citation"
              : " citations"}
          </span>
          <span>
            {deadlineCount} public
            {deadlineCount === 1
              ? " deadline"
              : " deadlines"}
          </span>
        </div>
      </div>

      <div className="smart-record__grid">
        <article className="smart-record__card smart-record__card--wide">
          <span className="smart-record__label">
            Approved purpose
          </span>
          <strong>
            {display(
              fields,
              "approved_purpose",
            )}
          </strong>
          <p>
            Public location scope:{" "}
            {display(
              fields,
              "public_location_scope",
            )}
          </p>
        </article>

        <article className="smart-record__card">
          <span className="smart-record__label">
            Data collected
          </span>
          <strong>
            {display(
              fields,
              "data_categories",
            )}
          </strong>
          <p>
            Collection mode:{" "}
            {display(
              fields,
              "collection_mode",
            )}
          </p>
        </article>

        <article className="smart-record__card">
          <span className="smart-record__label">
            Retention
          </span>
          <strong>
            {display(
              fields,
              "retention_days",
            )}{" "}
            days
          </strong>
          <p>
            {display(
              fields,
              "retention_basis",
            )}
          </p>
        </article>

        <article className="smart-record__card">
          <span className="smart-record__label">
            Legal process
          </span>
          <strong>
            {display(
              fields,
              "legal_process_requirement",
            )}
          </strong>
          <p>
            Sharing:{" "}
            {display(
              fields,
              "sharing_categories",
            )}
          </p>
        </article>

        <article className="smart-record__card">
          <span className="smart-record__label">
            Operator
          </span>
          {relationshipLinks(
            relationships,
            ["operated-by"],
            registryId,
          )}
        </article>

        <article className="smart-record__card">
          <span className="smart-record__label">
            Technology
          </span>
          {relationshipLinks(
            relationships,
            ["uses-technology"],
            registryId,
          )}
        </article>

        <article className="smart-record__card">
          <span className="smart-record__label">
            Vendors
          </span>
          {graphNodeLinks(
            graph,
            ["vendor"],
            registryId,
          )}
        </article>

        <article className="smart-record__card">
          <span className="smart-record__label">
            Authorization
          </span>
          {relationshipLinks(
            relationships,
            ["authorized-by"],
            registryId,
          )}
        </article>

        <article className="smart-record__card">
          <span className="smart-record__label">
            Governing policy
          </span>
          {relationshipLinks(
            relationships,
            ["governed-by"],
            registryId,
          )}
        </article>

        <article className="smart-record__card">
          <span className="smart-record__label">
            Procurement
          </span>
          {relationshipLinks(
            relationships,
            ["procured-through"],
            registryId,
          )}
        </article>

        <article className="smart-record__card">
          <span className="smart-record__label">
            Oversight
          </span>
          {relationshipLinks(
            relationships,
            [
              "audits-deployment",
              "concerns-deployment",
            ],
            registryId,
          )}
        </article>

        <article className="smart-record__card">
          <span className="smart-record__label">
            Data sharing
          </span>
          {relationshipLinks(
            relationships,
            [
              "data-sharing-for-deployment",
            ],
            registryId,
          )}
        </article>
      </div>
    </section>
  );
}
