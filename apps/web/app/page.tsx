import Link from "next/link";

import { getDatabasePool } from "../lib/database";
import { loadSmartCitiesHomepageData } from "../lib/smart-cities-homepage";

export const dynamic = "force-dynamic";

function dateLabel(
  value: string | undefined,
): string | undefined {
  if (!value) return undefined;

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

export default async function HomePage() {
  const data =
    await loadSmartCitiesHomepageData(
      getDatabasePool(),
    );

  if (!data) {
    return (
      <main className="page-shell">
        <section className="hero">
          <p className="eyebrow">
            Public surveillance transparency
          </p>
          <h1>
            Understand how smart-city
            surveillance is governed.
          </h1>
          <p className="lede">
            The Smart Cities Surveillance
            Registry is ready for its first
            registry configuration and public
            dataset.
          </p>
        </section>

        <section className="section-block">
          <div className="empty-state empty-state--inline">
            <h3>
              No public registry is installed
              yet
            </h3>
            <p>
              For local development, load the
              synthetic Harborview demonstration
              dataset.
            </p>
            <code>pnpm db:seed-demo</code>
          </div>
        </section>
      </main>
    );
  }

  const registryPath =
    "/registries/" +
    encodeURIComponent(
      data.registryId,
    );

  return (
    <main className="page-shell smart-home">
      <section className="smart-home__hero">
        <div className="smart-home__hero-copy">
          <p className="eyebrow">
            Public surveillance transparency
          </p>
          <h1>
            See the systems. Follow the
            authority. Check the evidence.
          </h1>
          <p className="lede">
            {data.description ??
              "Trace public surveillance deployments through the technologies, agencies, vendors, policies, contracts, audits, incidents, and data-sharing arrangements that govern them."}
          </p>

          <form
            className="smart-home__search"
            method="get"
            action={
              registryPath + "/search"
            }
          >
            <label htmlFor="home-search">
              Search the public registry
            </label>
            <div>
              <input
                id="home-search"
                name="q"
                type="search"
                placeholder="Search deployments, agencies, vendors, policies…"
              />
              <button type="submit">
                Search
              </button>
            </div>
          </form>
        </div>

        <aside
          className="smart-home__brief"
          aria-label="Registry overview"
        >
          <p className="eyebrow">
            Registry at a glance
          </p>
          <strong className="smart-home__big-number">
            {data.totalRecords}
          </strong>
          <span>
            public records connected through
            a common accountability graph
          </span>
          <Link href={registryPath}>
            Open full registry →
          </Link>
        </aside>
      </section>

      <section
        className="smart-home__metrics"
        aria-label="Registry metrics"
      >
        <Link
          href={
            registryPath +
            "/records?type=deployment"
          }
        >
          <strong>{data.deployments}</strong>
          <span>Deployments</span>
        </Link>
        <Link
          href={
            registryPath +
            "/records?type=technology"
          }
        >
          <strong>{data.technologies}</strong>
          <span>Technologies</span>
        </Link>
        <Link
          href={
            registryPath +
            "/records?type=agency"
          }
        >
          <strong>{data.agencies}</strong>
          <span>Public agencies</span>
        </Link>
        <Link
          href={
            registryPath +
            "/records?type=vendor"
          }
        >
          <strong>{data.vendors}</strong>
          <span>Vendors</span>
        </Link>
        <Link
          href={
            registryPath +
            "/records?type=audit"
          }
        >
          <strong>{data.audits}</strong>
          <span>Audits & assessments</span>
        </Link>
        <Link
          href={
            registryPath +
            "/records?type=violation"
          }
        >
          <strong>{data.incidents}</strong>
          <span>Incidents & findings</span>
        </Link>
      </section>

      <section
        className="section-block"
        aria-labelledby="accountability-heading"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              Accountability pulse
            </p>
            <h2 id="accountability-heading">
              What deserves attention next
            </h2>
          </div>
          <Link
            className="metric"
            href={
              registryPath +
              "/analytics"
            }
          >
            View analytics →
          </Link>
        </div>

        {data.upcomingDeadlines.length >
        0 ? (
          <div className="smart-home__deadline-grid">
            {data.upcomingDeadlines.map(
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
                  <small>
                    {
                      deadline.recordTypeName
                    }
                  </small>
                </Link>
              ),
            )}
          </div>
        ) : (
          <div className="empty-state empty-state--inline">
            <h3>
              No upcoming public deadlines
            </h3>
            <p>
              Published audit, review,
              expiration, renewal, and
              remediation dates will appear
              here automatically.
            </p>
          </div>
        )}
      </section>

      <section
        className="section-block"
        aria-labelledby="recent-heading"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              Recently published
            </p>
            <h2 id="recent-heading">
              New in the registry
            </h2>
          </div>
          <Link
            className="metric"
            href={
              registryPath + "/search"
            }
          >
            Search all records →
          </Link>
        </div>

        {data.recentRecords.length > 0 ? (
          <div className="smart-home__recent-list">
            {data.recentRecords.map(
              (record) => (
                <Link
                  className="smart-home__recent"
                  key={record.id}
                  href={
                    registryPath +
                    "/records/" +
                    encodeURIComponent(
                      record.id,
                    )
                  }
                >
                  <div>
                    <span className="smart-home__recent-type">
                      {
                        record.recordTypeName
                      }
                    </span>
                    <h3>{record.title}</h3>
                    {record.summary ? (
                      <p>
                        {record.summary}
                      </p>
                    ) : null}
                  </div>
                  <span className="smart-home__recent-date">
                    {dateLabel(
                      record.publishedAt,
                    ) ??
                      "Published"}
                  </span>
                </Link>
              ),
            )}
          </div>
        ) : (
          <div className="empty-state empty-state--inline">
            <h3>
              No public records yet
            </h3>
            <p>
              Newly published records will
              appear here automatically.
            </p>
          </div>
        )}
      </section>

      <section
        className="section-block"
        aria-labelledby="browse-heading"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              Browse the accountability graph
            </p>
            <h2 id="browse-heading">
              Follow the public record
            </h2>
          </div>
          <span className="metric">
            {data.recordTypes.length} record
            types
          </span>
        </div>

        <div className="smart-home__browse-grid">
          {data.recordTypes.map(
            (recordType) => (
              <Link
                key={recordType.id}
                href={
                  registryPath +
                  "/records?type=" +
                  encodeURIComponent(
                    recordType.id,
                  )
                }
                className="smart-home__browse-card"
              >
                <div className="smart-home__browse-topline">
                  <span>
                    {recordType.name}
                  </span>
                  <strong>
                    {recordType.count}
                  </strong>
                </div>
                <h3>
                  {recordType.pluralName}
                </h3>
                <p>
                  {recordType.description ??
                    "Browse public records in this category."}
                </p>
                <span className="registry-card__action">
                  Browse records →
                </span>
              </Link>
            ),
          )}
        </div>
      </section>

      <section
        className="smart-home__principles"
        aria-label="Registry principles"
      >
        <div>
          <strong>
            Primary-source driven
          </strong>
          <span>
            Material claims can be traced to
            public evidence and archived
            documents.
          </span>
        </div>
        <div>
          <strong>
            Accountability connected
          </strong>
          <span>
            Deployments connect to authority,
            money, technology, oversight, and
            remediation.
          </span>
        </div>
        <div>
          <strong>Public-safe</strong>
          <span>
            Transparency is designed not to
            expose exact operational or
            person-level surveillance data.
          </span>
        </div>
      </section>
    </main>
  );
}
