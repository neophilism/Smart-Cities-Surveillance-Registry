import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Breadcrumbs } from "../../../components/breadcrumbs";
import { getDatabasePool } from "../../../lib/database";
import {
  getPublicRegistry,
} from "../../../lib/public-registry";
import {
  loadSmartCitiesJurisdictionDetail,
} from "../../../lib/smart-cities-jurisdictions";
import {
  SMART_CITIES_REGISTRY_ID,
} from "../../../lib/smart-cities-public-safety";

export const dynamic = "force-dynamic";

interface JurisdictionPageProps {
  params: Promise<{
    jurisdiction: string;
  }>;
}

function dateLabel(
  value: string,
): string {
  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    },
  ).format(new Date(value));
}

export async function generateMetadata({
  params,
}: JurisdictionPageProps): Promise<Metadata> {
  const { jurisdiction } =
    await params;

  return {
    title: jurisdiction,
    description:
      "Public Smart Cities surveillance accountability records for " +
      jurisdiction +
      ".",
  };
}

export default async function JurisdictionPage({
  params,
}: JurisdictionPageProps) {
  const { jurisdiction } =
    await params;
  const registry =
    await getPublicRegistry(
      SMART_CITIES_REGISTRY_ID,
    );

  if (!registry) notFound();

  const detail =
    await loadSmartCitiesJurisdictionDetail(
      getDatabasePool(),
      registry.config,
      jurisdiction,
    );

  if (!detail) notFound();

  const registryPath =
    "/registries/" +
    encodeURIComponent(
      SMART_CITIES_REGISTRY_ID,
    );
  const searchPath =
    registryPath +
    "/search?sc_jurisdiction=" +
    encodeURIComponent(
      detail.name,
    );

  const count = (
    recordTypeId: string,
  ) =>
    detail.recordTypeCounts[
      recordTypeId
    ] ?? 0;

  return (
    <main className="page-shell">
      <Breadcrumbs
        items={[
          {
            label: "Registry",
            href: "/",
          },
          {
            label: "Jurisdictions",
            href: "/jurisdictions",
          },
          {
            label: detail.name,
          },
        ]}
      />

      <header className="page-heading">
        <p className="eyebrow">
          Jurisdiction explorer
        </p>
        <h1>{detail.name}</h1>
        <p className="lede">
          Public surveillance deployments
          and the accountability records
          connected to them. Location
          information is intentionally kept
          at broad public-area granularity.
        </p>
        <p>
          <Link
            className="button-link"
            href={searchPath}
          >
            Search this jurisdiction
          </Link>
        </p>
      </header>

      <section
        className="smart-home__metrics"
        aria-label="Jurisdiction accountability metrics"
      >
        <div>
          <strong>
            {
              detail
                .totalConnectedRecords
            }
          </strong>
          <span>
            Connected public records
          </span>
        </div>
        <div>
          <strong>
            {detail.deployments.length}
          </strong>
          <span>Deployments</span>
        </div>
        <div>
          <strong>
            {count("agency")}
          </strong>
          <span>Agencies</span>
        </div>
        <div>
          <strong>
            {count("technology")}
          </strong>
          <span>Technologies</span>
        </div>
        <div>
          <strong>
            {count("vendor")}
          </strong>
          <span>Vendors</span>
        </div>
        <div>
          <strong>
            {count("violation")}
          </strong>
          <span>Incidents</span>
        </div>
      </section>

      <section
        className="section-block"
        aria-labelledby="public-map-heading"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              Public-safe mapping
            </p>
            <h2 id="public-map-heading">
              General deployment areas
            </h2>
          </div>
          <span className="metric">
            Schematic — no device pins
          </span>
        </div>

        <div className="public-scope-map">
          <div className="public-scope-map__notice">
            <strong>
              This is not a device-location
              map.
            </strong>
            <span>
              It groups deployments only by
              broad public location
              descriptions published in the
              registry. Exact coordinates,
              covert placement, and live
              topology are intentionally
              excluded.
            </span>
          </div>

          {detail.mapScopes.length > 0 ? (
            <div className="public-scope-map__areas">
              {detail.mapScopes.map(
                (scope, index) => (
                  <section
                    className="public-scope-map__area"
                    key={scope.label}
                    style={{
                      gridColumn:
                        (index % 2) + 1,
                    }}
                  >
                    <span>
                      Public area
                    </span>
                    <h3>
                      {scope.label}
                    </h3>
                    <small>
                      {
                        scope.deploymentCount
                      }{" "}
                      {scope.deploymentCount ===
                      1
                        ? "deployment"
                        : "deployments"}
                    </small>
                    <div className="public-scope-map__links">
                      {scope.deployments.map(
                        (deployment) => (
                          <Link
                            key={
                              deployment.id
                            }
                            href={
                              registryPath +
                              "/records/" +
                              encodeURIComponent(
                                deployment.id,
                              )
                            }
                          >
                            {
                              deployment.name
                            }
                          </Link>
                        ),
                      )}
                    </div>
                  </section>
                ),
              )}
            </div>
          ) : (
            <div className="empty-state empty-state--inline">
              <h3>
                No public location scope
                published
              </h3>
              <p>
                The registry will not infer
                or geocode device locations.
              </p>
            </div>
          )}
        </div>
      </section>

      <section
        className="section-block"
        aria-labelledby="jurisdiction-deployments-heading"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              Deployments
            </p>
            <h2 id="jurisdiction-deployments-heading">
              Public programs in{" "}
              {detail.name}
            </h2>
          </div>
        </div>

        <div className="jurisdiction-deployment-list">
          {detail.deployments.map(
            (deployment) => (
              <Link
                key={deployment.id}
                href={
                  registryPath +
                  "/records/" +
                  encodeURIComponent(
                    deployment.id,
                  )
                }
              >
                <div>
                  <span>
                    {deployment.status}
                  </span>
                  <h3>
                    {deployment.name}
                  </h3>
                  <p>
                    {deployment.publicLocationScope ??
                      "Public location scope not specified"}
                  </p>
                </div>
                <strong>Open →</strong>
              </Link>
            ),
          )}
        </div>
      </section>

      {detail.upcomingDeadlines.length >
      0 ? (
        <section
          className="section-block"
          aria-labelledby="jurisdiction-deadlines-heading"
        >
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                Accountability calendar
              </p>
              <h2 id="jurisdiction-deadlines-heading">
                Upcoming public deadlines
              </h2>
            </div>
          </div>

          <div className="smart-home__deadline-grid">
            {detail.upcomingDeadlines.map(
              (deadline) => (
                <Link
                  key={deadline.id}
                  className="smart-home__deadline"
                  href={
                    registryPath +
                    "/records/" +
                    encodeURIComponent(
                      deadline.recordId,
                    )
                  }
                >
                  <span className="smart-home__deadline-date">
                    {dateLabel(
                      deadline.dueAt,
                    )}
                  </span>
                  <strong>
                    {deadline.label}
                  </strong>
                  <span>
                    {
                      deadline.recordTitle
                    }
                  </span>
                </Link>
              ),
            )}
          </div>
        </section>
      ) : null}

      <section
        className="section-block"
        aria-labelledby="jurisdiction-context-heading"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              Accountability network
            </p>
            <h2 id="jurisdiction-context-heading">
              Browse connected records
            </h2>
          </div>
        </div>

        <div className="smart-home__browse-grid">
          {registry.config.definition.recordTypes.map(
            (recordType) => (
              <Link
                key={recordType.id}
                className="smart-home__browse-card"
                href={
                  searchPath +
                  "&type=" +
                  encodeURIComponent(
                    recordType.id,
                  )
                }
              >
                <div className="smart-home__browse-topline">
                  <span>
                    {recordType.name}
                  </span>
                  <strong>
                    {count(
                      recordType.id,
                    )}
                  </strong>
                </div>
                <h3>
                  {recordType.pluralName}
                </h3>
                <p>
                  {recordType.description}
                </p>
                <span className="registry-card__action">
                  Browse in {detail.name} →
                </span>
              </Link>
            ),
          )}
        </div>
      </section>
    </main>
  );
}
