# Search accessibility and performance evidence

SC-27 retains the existing keyboard skip link, visible form focus and reduced
motion styles. Search now has a named landmark and a validation alert associated
with its controls. Structural search validation runs before candidate-resolution
queries. Invalid filters preserve their selected values and expose a correction
link; they do not display a false zero-result count. Infrastructure errors still
propagate rather than being mislabeled as invalid input.

Results include a polite, atomic range summary and a focusable heading. Pagination
links have explicit destination-page names, previous/next relationships, current
page semantics, and an optional result-heading fragment. The fragment is opt-in
so shared pagination consumers do not receive a nonexistent target. Pagination
prefetch is disabled to avoid speculative database-backed page loads. There is no
cross-request result cache, so a visibility or redaction change is not retained by
a newly introduced application cache.

`tests/search-pagination-feedback.test.mjs` exercises multi-value filter retention,
replacement of stale page parameters, optional anchors, invalid target pages, and
first/final/empty/out-of-range summaries. These are behavior tests, not a browser
or assistive-technology audit. Current-head CI must verify TSX types and build.

Calculated sRGB contrast for the existing base palette: muted text #65706a against
white is5.15:1, paper #f4f6f3 is4.74:1, and soft surface #edf1ed is4.51:1;
focus #1b5f43 against white is7.60:1. These calculations cover these exact pairs,
not every composited state or rendered pixel.

Search control outlines now use the muted palette color instead of the pale
decorative border, exceeding3:1 against the declared surfaces. The search input
may shrink inside its flex row to avoid its long placeholder forcing mobile
overflow. The contrast test computes ratios from actual CSS tokens; runtime
zoom/mobile checks remain required.
Specific keyboard-focus rules override the older translucent search focus ring.
Decimal range controls accept fractional values, and invalid selected sorts stay
available for correction rather than disappearing on the error page.

Remaining acceptance: run the real rendered UI through keyboard-only navigation,
screen-reader announcements, zoom/mobile and focus-after-pagination checks;
measure representative long-list search latency and browser performance under
load. No live browser, screen-reader, production load or certification result is
claimed by this change. Keep this PR draft until those acceptance checks and
remaining actionable fixes are completed.

For a local running application, run `node scripts/search-load-probe.mjs
http://127.0.0.1:3000/registries/REGISTRY_ID/search`. The probe is restricted to
loopback search routes, never follows redirects, caps concurrency/request count
and response size, and reports observed p50/p95 latency plus separate failures.
Its unit tests use HTTP-response fixtures; those timings are not product latency.
Run it against representative local data and retain the actual report before
claiming load acceptance. Do not point it at a production host.
