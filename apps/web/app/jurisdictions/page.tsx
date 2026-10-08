import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "../../components/breadcrumbs";
import { getDatabasePool } from "../../lib/database";
import {
  getPublicRegistry,
} from "../../lib/public-registry";
import {
  loadSmartCitiesJurisdictionSummaries,
} from "../../lib/smart-cities-jurisdictions";
import {
  SMART_CITIES_REGISTRY_ID,
} from "../../lib/smart-cities-public-safety";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Jurisdictions",
  description:
    "Explore public Smart Cities surveillance accountability records by jurisdiction.",
};

export default async function JurisdictionsPage() {
  const registry =
    await getPublicRegistry(
      SMART_CITIES_REGISTRY_ID,
    );
  const summaries = registry
    ? await loadSmartCitiesJurisdictionSummaries(
        getDatabasePool(),
        registry.config,
      )
    : [];

  const totalDeployments =
    summaries.reduce(
      (sum, item) =>
        sum + item.deployments,
      0,
    );
  const activeDeployments =
    summaries.reduce(
      (sum, item) =>
        sum + item.activeDeployments,
      0,
    );

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
          },
        ]}
      />

      <header className="page-heading">
        <p className="eyebrow">
          Jurisdiction explorer
        </p>
        <h1>
          Follow surveillance accountability
          place by place.
        </h1>
        <p className="lede">
          Browse public deployments and the
          agencies, vendors, policies,
          contracts, audits, incidents, and
          data-sharing arrangements connected
          to each jurisdiction.
        </p>
      </header>

      <section
        className="smart-home__metrics"
        aria-label="Jurisdiction totals"
      >
        <div>
          <strong>
            {summaries.length}
          </strong>
          <span>Jurisdictions</span>
        </div>
        <div>
          <strong>
            {totalDeployments}
          </strong>
          <span>Deployments</span>
        </div>
        <div>
          <strong>
            {activeDeployments}
          </strong>
          <span>Active deployments</span>
        </div>
      </section>

      <section
        className="section-block"
        aria-labelledby="jurisdiction-list-heading"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              Browse by jurisdiction
            </p>
            <h2 id="jurisdiction-list-heading">
              Public accountability areas
            </h2>
          </div>
        </div>

        {summaries.length > 0 ? (
          <div className="jurisdiction-grid">
            {summaries.map(
              (summary) => (
                <Link
                  key={summary.name}
                  className="jurisdiction-card"
                  href={
                    "/jurisdictions/" +
                    encodeURIComponent(
                      summary.name,
                    )
                  }
                >
                  <span className="jurisdiction-card__kicker">
                    Jurisdiction
                  </span>
                  <h3>
                    {summary.name}
                  </h3>
                  <dl>
                    <div>
                      <dt>Deployments</dt>
                      <dd>
                        {
                          summary.deployments
                        }
                      </dd>
                    </div>
                    <div>
                      <dt>Active</dt>
                      <dd>
                        {
                          summary.activeDeployments
                        }
                      </dd>
                    </div>
                    <div>
                      <dt>Agencies</dt>
                      <dd>
                        {
                          summary.agencies
                        }
                      </dd>
                    </div>
                  </dl>
                  <span className="registry-card__action">
                    Explore jurisdiction →
                  </span>
                </Link>
              ),
            )}
          </div>
        ) : (
          <div className="empty-state empty-state--inline">
            <h3>
              No public jurisdictions yet
            </h3>
            <p>
              Jurisdictions appear
              automatically when public
              deployment or agency records
              include a jurisdiction.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
