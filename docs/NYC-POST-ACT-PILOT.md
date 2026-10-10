# First real-source pilot: NYC NYPD POST Act (disabled pending review)

**Verified source URL (October 9, 2026):**
https://www.nyc.gov/site/nypd/about/about-nypd/policy/post-act.page

This is an official NYPD page publishing surveillance technology
impact-and-use policy documents. Its public document links include real
`https://www.nyc.gov/assets/nypd/.../*.pdf` URLs. The configured
`html-catalog` adapter only follows this allowlisted hostname and only
recognizes PDF links. It collects document **metadata and hyperlinks**,
not operational device coordinates, case files, or protected targets.

## What the pilot produces

- Draft `policy` records for each PDF document link.
- Stable source-derived IDs and original public PDF URLs.
- `policy_type: agency_policy`, `authority_level: agency`, and
  `policy_status: unknown` until a reviewer confirms current status.
- Explicit source provenance and an official-record external identifier.
- No automatic public publication. Only a separate authorized reviewer
  can approve and publish these draft entries.

The source is intentionally `enabled: false` in
`config/official-sources.json` until the live catalog is tested,
record mappings are inspected, and an authorized editor signs off.
In particular, these PDFs are **policies**, not evidence that any
specific installation or citywide deployment exists; do not manufacture
`deployment` records from these policy documents.

## Live activation checklist

1. Deploy the registry and initialize its PostgreSQL schema.
2. Confirm the official NYPD URL and selected PDF links still resolve,
   remain on the approved hostname, and meet the public-safety rules.
3. Run the source adapter in a nonpublishing review environment.
   Compare the discovered document names, number of links and original
   URLs against the official source page. The test suite currently uses
   synthetic fixture markup, not real network calls.
4. Verify all imported records are `draft`, have valid policy schema,
   have source IDs and stable fingerprints, and have not been published.
5. Obtain independent editorial approval before setting `enabled: true`.
6. Configure the worker's database secret and
   `SMART_CITIES_REFRESH_ENABLED=true` only after pilot review.
7. Enable Engine Room telemetry and a real site readiness probe
   independently. Verify ingestion run counts and stale-source alerts.

The public-facing website may launch with zero records while approval
is outstanding. It should never present unverified imported policies as
reviewed findings.

## Known limitations

The HTML catalog adapter uses a meaningful source filename as a title
when an official page's link text is only the generic label `PDF`.
A source filename does not itself establish the policy's official title
or current validity; reviewer confirmation is mandatory.

No PDF bytes are archived by this metadata pilot. Durable evidence
storage must be provisioned before enabling attachment extraction and
search over public PDF contents.
