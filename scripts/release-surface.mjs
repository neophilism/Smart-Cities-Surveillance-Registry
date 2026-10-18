/**
 * Bounded, read-only production API smoke test.
 * A healthy HTTP response is necessary but not full release acceptance.
 */
export async function inspectReleaseSurface(origin, fetchImpl = fetch) {
  const base = new URL(origin);
  if (base.protocol !== "https:" || base.username || base.password ||
      base.pathname !== "/" || base.search || base.hash) {
    throw new Error("Approved origin must be a clean HTTPS origin.");
  }
  const paths = ["/api/ready", "/api/v1", "/api/v1/openapi.json"];
  const reports = [];
  for (const path of paths) {
    const response = await fetchImpl(new URL(path, base), {
      method: "GET", redirect: "error", signal: AbortSignal.timeout(5000),
      headers: { Accept: "application/json" },
    });
    if (response.status !== 200) throw new Error("Release surface unavailable: " + path);
    const data = await response.json();
    if (path === "/api/ready" && (data?.status !== "ready" ||
        data?.service !== "smart-cities-surveillance-registry")) {
      throw new Error("Wrong readiness identity");
    }
    if (path === "/api/v1/openapi.json" && (!data?.openapi || !data?.paths)) {
      throw new Error("OpenAPI document unavailable");
    }
    reports.push({ path, status: response.status });
  }
  return { verifiedAt: new Date().toISOString(), reports };
}
