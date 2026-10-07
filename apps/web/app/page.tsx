import Link from "next/link";

import { listPublicRegistries } from "../lib/public-registry";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const registries = await listPublicRegistries();

  return (
    <main className="page-shell">
      <section className="hero">
        <p className="eyebrow">Public surveillance transparency</p>
        <h1>Understand how smart-city surveillance is governed.</h1>
        <p className="lede">
          This application is being built to connect public records about
          surveillance deployments, technologies, agencies, vendors,
          governing policies, audits, and accountability.
        </p>
      </section>

      <section
        className="section-block"
        aria-labelledby="registries-heading"
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">Application foundation</p>
            <h2 id="registries-heading">Registry configuration</h2>
          </div>
          <span className="metric">
            {registries.length}{" "}
            {registries.length === 1 ? "registry" : "registries"}
          </span>
        </div>

        {registries.length > 0 ? (
          <div className="registry-grid">
            {registries.map(({ config }) => {
              const definition = config.definition;
              const href = `/registries/${encodeURIComponent(
                definition.id,
              )}`;

              return (
                <Link
                  className="registry-card"
                  key={definition.id}
                  href={href}
                >
                  <span className="registry-card__kicker">
                    Public registry
                  </span>
                  <h3>{definition.name}</h3>
                  <p>
                    {definition.description ??
                      "Browse the public records configured for this registry."}
                  </p>
                  <div className="registry-card__footer">
                    <span>
                      {definition.recordTypes.length}{" "}
                      {definition.recordTypes.length === 1
                        ? "record type"
                        : "record types"}
                    </span>
                    <span className="registry-card__action">
                      Open registry →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="empty-state empty-state--inline">
            <h3>Smart Cities schema arrives in PR 2</h3>
            <p>
              PR 1 establishes the clean engine-derived application
              foundation. The surveillance registry schema is the next
              independently reviewable milestone.
            </p>
          </div>
        )}
      </section>

      <section className="principle-strip" aria-label="Application principles">
        <div>
          <strong>Primary-source driven</strong>
          <span>Public claims should remain traceable to evidence.</span>
        </div>
        <div>
          <strong>Public-safe</strong>
          <span>Transparency must not expose sensitive operational details.</span>
        </div>
        <div>
          <strong>Engine-backed</strong>
          <span>Generic infrastructure remains reusable upstream.</span>
        </div>
      </section>
    </main>
  );
}
